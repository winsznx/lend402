import { NextRequest, NextResponse } from "next/server";
import { listCallsByVaultIds, listVaultsByProvider } from "@/lib/db";
import { readDashboardAuth } from "@/lib/dashboard-auth";
import { getGatewayBaseUrl } from "@/lib/server-config";
import { getExplorerTxUrl } from "@/lib/public-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function truncateTxid(txid: string): string {
  return txid.length > 14 ? `${txid.slice(0, 8)}...${txid.slice(-4)}` : txid;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let auth;

  try {
    auth = readDashboardAuth(req.headers);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 401 }
    );
  }

  const baseUrl = getGatewayBaseUrl(req.nextUrl.origin);

  let vaults;
  try {
    vaults = await listVaultsByProvider(auth.address);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }

  if (vaults.length === 0) {
    return NextResponse.json({ vaults: [], totalRevenueUsdcx: 0 });
  }

  const vaultIds = vaults.map((vault) => vault.vault_id);
  let calls;
  try {
    calls = await listCallsByVaultIds(vaultIds);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }

  const groupedCalls = new Map<string, typeof calls>();
  for (const call of calls) {
    const existing = groupedCalls.get(call.vault_id) ?? [];
    if (existing.length < 10) {
      existing.push(call);
      groupedCalls.set(call.vault_id, existing);
    }
  }

  const payload = vaults.map((vault) => ({
    vaultId: vault.vault_id,
    providerAddress: vault.provider_address,
    resourceName: vault.resource_name,
    description: vault.description,
    wrappedUrl: `${baseUrl}/v/${vault.vault_id}/`,
    priceUsdcx: vault.price_usdcx,
    rateLimit: vault.rate_limit,
    totalCalls: vault.total_calls,
    totalEarnedUsdcx: vault.total_earned_usdcx,
    isActive: vault.is_active,
    createdAt: vault.created_at,
    updatedAt: vault.updated_at,
    recentCalls: (groupedCalls.get(vault.vault_id) ?? []).map((call) => ({
      callId: call.call_id,
      settledAt: call.settled_at,
      payerAddress: call.payer_address,
      txid: call.txid,
      txidDisplay: truncateTxid(call.txid),
      explorerUrl: getExplorerTxUrl(call.txid),
      amountUsdcx: call.amount_usdcx,
      originStatus: call.origin_status,
      status:
        call.origin_status && call.origin_status >= 200 && call.origin_status < 300
          ? "success"
          : "origin_error",
    })),
  }));

  const totalRevenueUsdcx = payload.reduce(
    (sum, vault) => sum + vault.totalEarnedUsdcx,
    0
  );

  return NextResponse.json({ vaults: payload, totalRevenueUsdcx });
}
