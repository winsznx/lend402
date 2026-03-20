import { NextRequest, NextResponse } from "next/server";
import {
  type Address,
  addressFromHashMode,
  addressToString,
  ClarityType,
  deserializeTransaction,
  PayloadType,
  txidFromData,
} from "@stacks/transactions";
import {
  findActiveVaultById,
  incrementVaultCounters,
  insertCall,
  updateCallOriginStatus,
} from "@/lib/db";
import { checkGlobalRateLimit, checkAndIncrRateLimit, getSettled, setSettled } from "@/lib/redis";
import { isAllowedUrl } from "@/lib/ssrf";
import { deliverCallSettledWebhook } from "@/lib/webhook";
import {
  buildPaymentRequiredBody,
  buildPaymentRequiredHeader,
  buildPaymentResponseHeader,
  buildSettlementRequest,
  parseLegacyXPaymentHeader,
  parsePaymentSignatureHeader,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  verifyXPayment,
} from "@/lib/x402";
import { DEFAULT_USDCX_CONTRACT, normalizeTxid } from "@/lib/network";
import { getServerStacksConfig } from "@/lib/server-config";
import { settleStacksPayment } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 60_000;
const PROXY_TIMEOUT_MS = 30_000;
const CHALLENGE_RATE_LIMIT = 120;

interface RouteParams {
  params: Promise<{ vault_id: string; path?: string[] }>;
}

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

function buildProxyTarget(originUrl: string, pathSegments: string[], search: string): string {
  const target = new URL(originUrl);
  const suffix = pathSegments.join("/");

  if (suffix) {
    const basePath = target.pathname.replace(/\/+$/, "");
    target.pathname = `${basePath}/${suffix}`.replace(/\/{2,}/g, "/");
  }

  // Merge request query params on top of origin's registered params (don't replace)
  if (search) {
    const extra = new URLSearchParams(search);
    extra.forEach((value, key) => target.searchParams.set(key, value));
  }
  return target.toString();
}

function getCallerIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

function validateBorrowAndPayTransaction(params: {
  signedTransactionHex: string;
  priceUsdcx: number;
  providerAddress: string;
}) {
  const stacksConfig = getServerStacksConfig();
  const tx = deserializeTransaction(params.signedTransactionHex);
  const spendingCondition = tx.auth.spendingCondition;
  const payerAddress = addressToString(
    addressFromHashMode(spendingCondition.hashMode, tx.version, spendingCondition.signer)
  );
  const txid = normalizeTxid(txidFromData(Buffer.from(params.signedTransactionHex, "hex")));
  const payload = tx.payload;

  if (payload.payloadType !== PayloadType.ContractCall) {
    throw new Error("Signed transaction is not a contract-call");
  }

  const contractAddress = addressToString(payload.contractAddress);
  if (
    contractAddress !== stacksConfig.vaultContractAddress ||
    payload.contractName.content !== stacksConfig.vaultContractName
  ) {
    throw new Error("Signed transaction targets the wrong vault contract");
  }

  if (payload.functionName.content !== "borrow-and-pay") {
    throw new Error("Signed transaction must call borrow-and-pay");
  }

  if (payload.functionArgs.length !== 3) {
    throw new Error("borrow-and-pay transaction has unexpected argument count");
  }

  const amountArg = payload.functionArgs[0] as { type: ClarityType; value?: bigint };
  const merchantArg = payload.functionArgs[1] as {
    type: ClarityType;
    address?: unknown;
  };
  const collateralArg = payload.functionArgs[2] as { type: ClarityType; value?: bigint };

  if (amountArg.type !== ClarityType.UInt || amountArg.value !== BigInt(params.priceUsdcx)) {
    throw new Error("Signed transaction amount does not match the vault price");
  }

  if (merchantArg.type !== ClarityType.PrincipalStandard || !merchantArg.address) {
    throw new Error("Signed transaction merchant is not a standard principal");
  }

  if (addressToString(merchantArg.address as Address) !== params.providerAddress) {
    throw new Error("Signed transaction merchant does not match the vault provider");
  }

  if (collateralArg.type !== ClarityType.UInt || !collateralArg.value || collateralArg.value <= 0n) {
    throw new Error("Signed transaction collateral must be greater than zero");
  }

  return { tx, txid, payerAddress };
}

async function handleRequest(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { vault_id, path = [] } = await params;
  const callerIp = getCallerIp(req);

  const globalOk = await checkGlobalRateLimit().catch(() => true);
  if (!globalOk) {
    return jsonError("Global rate limit exceeded", 429, { retryAfterMs: RATE_WINDOW_MS });
  }

  let vault;
  try {
    vault = await findActiveVaultById(vault_id);
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }

  if (!vault) {
    return jsonError("Vault not found", 404);
  }
  const ssrfCheck = isAllowedUrl(vault.origin_url);
  if (!ssrfCheck.allowed) {
    console.error(`[gateway] blocked origin for vault ${vault_id}: ${ssrfCheck.reason}`);
    return jsonError("Invalid vault origin configuration", 502);
  }

  const resourceUrl = req.nextUrl.toString();
  const paymentRequiredBody = buildPaymentRequiredBody({
    network: vault.network,
    priceUsdcx: vault.price_usdcx,
    payTo: vault.provider_address,
    resource: resourceUrl,
    description: vault.description ?? vault.resource_name,
    asset: vault.asset_contract,
    // sBTC asset is derived from the network; the gateway includes it in the
    // multi-rail accepts array to demonstrate x402 V2 multi-rail awareness.
    // The conservative reference price used for the satoshi quote is documented
    // in buildPaymentRequiredBody and marked amountIsApproximate in extra.
  });
  const paymentRequiredHeader = buildPaymentRequiredHeader(paymentRequiredBody);
  const paymentSignatureRaw = req.headers.get(PAYMENT_SIGNATURE_HEADER);
  const legacyXPaymentRaw = req.headers.get("x-payment");

  if (!paymentSignatureRaw && !legacyXPaymentRaw) {
    const anonymousRate = await checkAndIncrRateLimit(
      `challenge:${vault.vault_id}:${callerIp}`,
      CHALLENGE_RATE_LIMIT,
      RATE_WINDOW_MS
    ).catch(() => ({ allowed: true, count: 0 }));

    if (!anonymousRate.allowed) {
      return jsonError("Challenge rate limit exceeded", 429, {
        retryAfterMs: RATE_WINDOW_MS,
      });
    }

    return NextResponse.json(
      paymentRequiredBody,
      {
        status: 402,
        headers: {
          [PAYMENT_REQUIRED_HEADER]: paymentRequiredHeader,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": `${PAYMENT_REQUIRED_HEADER}, ${PAYMENT_RESPONSE_HEADER}, x-lend402-warning`,
        },
      }
    );
  }

  let xPayment;
  try {
    xPayment = paymentSignatureRaw
      ? parsePaymentSignatureHeader(paymentSignatureRaw)
      : parseLegacyXPaymentHeader(
          legacyXPaymentRaw as string,
          paymentRequiredBody.accepts[0],
          paymentRequiredBody.resource
        );
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const paymentCheck = verifyXPayment(xPayment, vault.network, vault.provider_address);
  if (!paymentCheck.valid) {
    return jsonError(paymentCheck.reason ?? "Invalid payment payload", 400);
  }

  // If the agent chose the sBTC direct-pay option from accepts[], surface a
  // clear error. sBTC direct settlement (not via borrow-and-pay) is not yet
  // active on this gateway. The `railStatus: "active"` in extra already
  // advertises this option; this guard makes the failure message actionable.
  const usdcxContracts = Object.values(DEFAULT_USDCX_CONTRACT);
  if (!usdcxContracts.includes(xPayment.accepted.asset)) {
    return jsonError(
      `Payment asset ${xPayment.accepted.asset} is not accepted. This gateway settles USDCx payments only.`,
      422
    );
  }

  const signedTransactionHex = xPayment.payload.transaction.replace(/^0x/i, "");
  let payerAddress: string;
  let txid: string;
  try {
    ({ payerAddress, txid } = validateBorrowAndPayTransaction({
      signedTransactionHex,
      priceUsdcx: vault.price_usdcx,
      providerAddress: vault.provider_address,
    }));
  } catch (error) {
    return jsonError(`Invalid signed transaction: ${(error as Error).message}`, 400);
  }

  // x402 V2 payment-identifier extension integrity check.
  // The agent SDK sets extensions["payment-identifier"] to the txid it computed
  // locally before sending. We verify it matches the txid we derived
  // independently from deserializing the transaction, catching any payload
  // tampering before spending a broadcast attempt.
  const declaredIdentifier = xPayment.extensions?.["payment-identifier"];
  if (declaredIdentifier && typeof declaredIdentifier === "string") {
    const normalised = declaredIdentifier.startsWith("0x")
      ? declaredIdentifier
      : `0x${declaredIdentifier}`;
    if (normalised !== txid) {
      return jsonError(
        `payment-identifier mismatch: declared ${declaredIdentifier}, computed ${txid}`,
        400
      );
    }
  }

  const rate = await checkAndIncrRateLimit(
    `rate:${vault.vault_id}:${payerAddress}`,
    vault.rate_limit,
    RATE_WINDOW_MS
  ).catch(() => ({ allowed: true, count: 0 }));

  if (!rate.allowed) {
    return jsonError("Rate limit exceeded", 429, { retryAfterMs: RATE_WINDOW_MS });
  }

  const settled = await getSettled(txid).catch(() => null);
  if (settled) {
    return jsonError("Transaction already settled", 409, { txid });
  }

  let settlement;
  try {
    settlement = await settleStacksPayment(
      buildSettlementRequest(xPayment, resourceUrl, vault.provider_address)
    );
  } catch (error) {
    return NextResponse.json(
      {
        ...paymentRequiredBody,
        error: (error as Error).message || "Payment settlement failed",
        txid,
      },
      {
        status: 402,
        headers: {
          [PAYMENT_REQUIRED_HEADER]: paymentRequiredHeader,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": `${PAYMENT_REQUIRED_HEADER}, ${PAYMENT_RESPONSE_HEADER}, x-lend402-warning`,
        },
      }
    );
  }

  await setSettled(txid, {
    blockHeight: settlement.blockHeight,
    confirmedAt: settlement.confirmedAt,
    payer: settlement.payer,
  }).catch((error) => {
    console.error("[gateway] failed to persist settled tx:", (error as Error).message);
  });

  let callInsert = null;
  try {
    callInsert = await insertCall({
      vault_id: vault.vault_id,
      payer_address: settlement.payer,
      txid,
      block_height: settlement.blockHeight,
      amount_usdcx: vault.price_usdcx,
      path: `/${path.join("/")}`,
      method: req.method,
      origin_status: null,
      x402_payload: xPayment,
    });
  } catch (error) {
    console.error("[gateway] failed to insert call:", (error as Error).message);
  }

  await incrementVaultCounters(vault.vault_id, vault.price_usdcx).catch((error) => {
    console.error("[gateway] failed to increment vault counters:", (error as Error).message);
  });

  if (callInsert?.call_id) {
    void deliverCallSettledWebhook({
      webhookUrl: vault.webhook_url,
      callId: callInsert.call_id,
      payload: {
        event: "call.settled",
        vaultId: vault.vault_id,
        txid,
        payer: settlement.payer,
        amountUsdcx: vault.price_usdcx,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const proxyHeaders = new Headers(req.headers);
  proxyHeaders.delete(PAYMENT_SIGNATURE_HEADER);
  proxyHeaders.delete("x-payment");
  proxyHeaders.delete("host");
  proxyHeaders.delete("authorization");
  proxyHeaders.delete("connection");
  proxyHeaders.delete("transfer-encoding");
  proxyHeaders.set("x-forwarded-for", callerIp);
  proxyHeaders.set("x-lend402-vault-id", vault.vault_id);
  proxyHeaders.set("x-lend402-payer", settlement.payer);
  proxyHeaders.set("x-lend402-txid", txid);

  const proxyTarget = buildProxyTarget(vault.origin_url, path, req.nextUrl.search);
  const requestBody =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  let originResponse: Response;
  try {
    originResponse = await fetch(proxyTarget, {
      method: req.method,
      headers: proxyHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    });
  } catch (error) {
    await updateCallOriginStatus(txid, 503).catch(() => undefined);

    return jsonError("Origin request failed after payment confirmation", 502, {
      txid,
      message: (error as Error).message,
    });
  }

  await updateCallOriginStatus(txid, originResponse.status).catch(() => undefined);

  const responseHeaders = new Headers();
  originResponse.headers.forEach((value, key) => {
    if (!["connection", "keep-alive", "transfer-encoding", "content-encoding"].includes(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  responseHeaders.set(
    PAYMENT_RESPONSE_HEADER,
    buildPaymentResponseHeader({
      txid,
      network: vault.network,
      payer: settlement.payer,
      blockHeight: settlement.blockHeight,
      confirmedAt: settlement.confirmedAt,
    })
  );
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set(
    "Access-Control-Expose-Headers",
    `${PAYMENT_RESPONSE_HEADER}, x-lend402-warning`
  );

  if (originResponse.status < 200 || originResponse.status >= 300) {
    responseHeaders.set("x-lend402-warning", "origin_error");
  }

  const responseBody = await originResponse.arrayBuffer();

  return new NextResponse(responseBody, {
    status: originResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  return handleRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  return handleRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  return handleRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  return handleRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteParams): Promise<NextResponse> {
  return handleRequest(req, ctx);
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        `Content-Type, ${PAYMENT_SIGNATURE_HEADER}, x-payment, x-wallet-address, x-wallet-signature, x-wallet-message, x-wallet-timestamp`,
      "Access-Control-Expose-Headers": `${PAYMENT_REQUIRED_HEADER}, ${PAYMENT_RESPONSE_HEADER}, x-lend402-warning`,
      "Access-Control-Max-Age": "86400",
    },
  });
}
