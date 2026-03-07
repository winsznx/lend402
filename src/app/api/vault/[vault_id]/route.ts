import { NextRequest, NextResponse } from "next/server";
import { findVaultById, updateVaultById } from "@/lib/db";
import { readDashboardAuth } from "@/lib/dashboard-auth";
import { isAllowedUrl } from "@/lib/ssrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ vault_id: string }>;
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { vault_id } = await params;
  let vault;
  try {
    vault = await findVaultById(vault_id);
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }

  if (!vault || !vault.is_active) {
    return jsonError("Vault not found", 404);
  }

  return NextResponse.json(
    {
      vaultId: vault.vault_id,
      resourceName: vault.resource_name,
      description: vault.description,
      priceUsdcx: vault.price_usdcx,
      network: vault.network,
      asset: vault.asset_contract,
      totalCalls: vault.total_calls,
      isActive: vault.is_active,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=10",
      },
    }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { vault_id } = await params;
  let auth;

  try {
    auth = readDashboardAuth(req.headers);
  } catch (error) {
    return jsonError((error as Error).message, 401);
  }

  const { address } = auth;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (
    "originUrl" in body ||
    "origin_url" in body ||
    "providerAddress" in body ||
    "provider_address" in body ||
    "network" in body
  ) {
    return jsonError("originUrl, providerAddress, and network are immutable", 400);
  }

  const updates: {
    price_usdcx?: number;
    rate_limit?: number;
    description?: string | null;
    webhook_url?: string | null;
  } = {};

  if (body.priceUsdcx !== undefined) {
    if (
      !Number.isInteger(body.priceUsdcx) ||
      Number(body.priceUsdcx) < 1_000 ||
      Number(body.priceUsdcx) > 1_000_000_000
    ) {
      return jsonError("priceUsdcx must be between 1000 and 1000000000", 400);
    }
    updates.price_usdcx = Number(body.priceUsdcx);
  }

  if (body.rateLimit !== undefined) {
    if (
      !Number.isInteger(body.rateLimit) ||
      Number(body.rateLimit) < 1 ||
      Number(body.rateLimit) > 1000
    ) {
      return jsonError("rateLimit must be between 1 and 1000", 400);
    }
    updates.rate_limit = Number(body.rateLimit);
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return jsonError("description must be a string or null", 400);
    }
    if (typeof body.description === "string" && body.description.length > 256) {
      return jsonError("description must be <= 256 characters", 400);
    }
    updates.description = (body.description as string | null) ?? null;
  }

  if (body.webhookUrl !== undefined) {
    if (body.webhookUrl !== null && typeof body.webhookUrl !== "string") {
      return jsonError("webhookUrl must be a string or null", 400);
    }
    if (typeof body.webhookUrl === "string") {
      const check = isAllowedUrl(body.webhookUrl);
      if (!check.allowed) {
        return jsonError(check.reason ?? "Invalid webhookUrl", 422);
      }
    }
    updates.webhook_url = (body.webhookUrl as string | null) ?? null;
  }

  let existing;
  try {
    existing = await findVaultById(vault_id);
  } catch (error) {
    return jsonError((error as Error).message, 500);
  }

  if (!existing) {
    return jsonError("Vault not found", 404);
  }

  if (existing.provider_address !== address) {
    return jsonError("Forbidden", 403);
  }

  let updated;
  try {
    updated = await updateVaultById(vault_id, updates);
  } catch (error) {
    return jsonError((error as Error).message ?? "Failed to update vault", 500);
  }

  if (!updated) {
    return jsonError("Failed to update vault", 500);
  }

  return NextResponse.json({
    vaultId: updated.vault_id,
    resourceName: updated.resource_name,
    description: updated.description,
    priceUsdcx: updated.price_usdcx,
    rateLimit: updated.rate_limit,
    webhookUrl: updated.webhook_url,
    isActive: updated.is_active,
    updatedAt: updated.updated_at,
  });
}
