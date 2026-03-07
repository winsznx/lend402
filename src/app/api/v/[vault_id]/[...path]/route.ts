import { NextRequest, NextResponse } from "next/server";
import {
  addressFromHashMode,
  addressToString,
  deserializeTransaction,
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
import { normalizeTxid } from "@/lib/network";
import { settleStacksPayment } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 60_000;
const PROXY_TIMEOUT_MS = 30_000;

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

  target.search = search;
  return target.toString();
}

function getCallerIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

async function handleRequest(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { vault_id, path = [] } = await params;

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
  });
  const paymentRequiredHeader = buildPaymentRequiredHeader(paymentRequiredBody);
  const paymentSignatureRaw = req.headers.get(PAYMENT_SIGNATURE_HEADER);
  const legacyXPaymentRaw = req.headers.get("x-payment");

  if (!paymentSignatureRaw && !legacyXPaymentRaw) {
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

  const signedTransactionHex = xPayment.payload.transaction.replace(/^0x/i, "");
  let payerAddress: string;
  let txid: string;
  try {
    const tx = deserializeTransaction(signedTransactionHex);
    const spendingCondition = tx.auth.spendingCondition;
    payerAddress = addressToString(
      addressFromHashMode(spendingCondition.hashMode, tx.version, spendingCondition.signer)
    );
    txid = normalizeTxid(txidFromData(Buffer.from(signedTransactionHex, "hex")));
  } catch (error) {
    return jsonError(`Unable to decode signed transaction: ${(error as Error).message}`, 400);
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
  proxyHeaders.set("x-forwarded-for", getCallerIp(req));
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
    if (!["connection", "keep-alive", "transfer-encoding"].includes(key.toLowerCase())) {
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
