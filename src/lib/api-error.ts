import { NextResponse } from "next/server";
import type { HttpStatus } from "@/lib/http-status";

export function jsonError(
  error: string,
  status: HttpStatus,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}
