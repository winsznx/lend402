import { NextRequest, NextResponse } from "next/server";
import { createVault, findVaultRegistrationDuplicate } from "@/lib/db";
import { isAllowedUrl } from "@/lib/ssrf";
import { getGatewayBaseUrl, getServerStacksConfig } from "@/lib/server-config";
import {
  validateVaultRegistrationMessage,
  verifyWalletSignature,
} from "@/lib/wallet-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RegisterBody {
  readonly originUrl: string;
  readonly priceUsdcx: number;
  readonly rateLimit: number;
  readonly resourceName: string;
  readonly description?: string | null;
  readonly webhookUrl?: string | null;
  readonly providerAddress: string;
  readonly signature: string;
  readonly message: string;
}

function badRequest(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: RegisterBody;

  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const {
    originUrl,
    priceUsdcx,
    rateLimit,
    resourceName,
    description,
    webhookUrl,
    providerAddress,
    signature,
    message,
  } = body;

  if (!originUrl || typeof originUrl !== "string") {
    return badRequest("originUrl is required");
  }

  const originCheck = isAllowedUrl(originUrl);
  if (!originCheck.allowed) {
    return badRequest(originCheck.reason ?? "Invalid originUrl");
  }

  if (
    !Number.isInteger(priceUsdcx) ||
    priceUsdcx < 1_000 ||
    priceUsdcx > 1_000_000_000
  ) {
    return badRequest("priceUsdcx must be between 1000 and 1000000000");
  }

  if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 1000) {
    return badRequest("rateLimit must be between 1 and 1000");
  }

  if (
    !resourceName ||
    typeof resourceName !== "string" ||
    resourceName.length > 64 ||
    resourceName.includes("\n")
  ) {
    return badRequest("resourceName is required and must be <= 64 characters");
  }

  if (description && description.length > 256) {
    return badRequest("description must be <= 256 characters");
  }

  if (webhookUrl) {
    const webhookCheck = isAllowedUrl(webhookUrl);
    if (!webhookCheck.allowed) {
      return badRequest(webhookCheck.reason ?? "Invalid webhookUrl", 422);
    }
  }

  if (!providerAddress || !signature || !message) {
    return badRequest("providerAddress, signature, and message are required");
  }

  try {
    validateVaultRegistrationMessage(originUrl, message);
  } catch (error) {
    return badRequest((error as Error).message, 401);
  }

  const stacksConfig = getServerStacksConfig();

  try {
    verifyWalletSignature({
      address: providerAddress,
      message,
      signature,
      transactionVersion: stacksConfig.transactionVersion,
    });
  } catch (error) {
    return badRequest((error as Error).message, 401);
  }

  let duplicate;
  try {
    duplicate = await findVaultRegistrationDuplicate(providerAddress, originUrl);
  } catch (error) {
    console.error("[vault/register] duplicate check failed:", (error as Error).message);
    return badRequest("Failed to validate vault uniqueness", 500);
  }

  if (duplicate) {
    return badRequest("Vault already registered for this originUrl", 409);
  }

  let insert;
  try {
    insert = await createVault({
      provider_address: providerAddress,
      origin_url: originUrl,
      price_usdcx: priceUsdcx,
      rate_limit: rateLimit,
      resource_name: resourceName.trim(),
      description: description?.trim() || null,
      webhook_url: webhookUrl?.trim() || null,
      network: stacksConfig.caip2NetworkId,
      asset_contract: stacksConfig.usdcxContractId,
    });
  } catch (error) {
    console.error("[vault/register] insert failed:", (error as Error).message);
    return badRequest("Failed to register vault", 500);
  }

  const baseUrl = getGatewayBaseUrl(req.nextUrl.origin);

  return NextResponse.json(
    {
      vaultId: insert.vault_id,
      wrappedUrl: `${baseUrl}/v/${insert.vault_id}/`,
      createdAt: insert.created_at,
    },
    { status: 201 }
  );
}
