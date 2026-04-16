import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: "lend402-dashboard",
    version: process.env.npm_package_version ?? "unknown",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_SHA ?? "unknown",
    network: process.env.STACKS_NETWORK ?? "mainnet",
  });
}
