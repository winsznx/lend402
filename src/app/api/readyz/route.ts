import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const checks = {
    database: Boolean(process.env.DATABASE_URL),
    redis: Boolean(process.env.REDIS_URL),
    vault: Boolean(process.env.LEND402_VAULT_CONTRACT_ID),
  };

  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { ready, checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
