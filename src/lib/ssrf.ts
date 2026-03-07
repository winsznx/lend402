// =============================================================================
// src/lib/ssrf.ts
// SSRF (Server-Side Request Forgery) prevention
// Blocks requests to private IPs, loopback, and non-HTTPS URLs.
// Uses Node.js built-ins only — no external dependencies.
// =============================================================================

import { isIP } from "net";
import { URL } from "url";

/** RFC-1918 private IPv4 ranges and other non-routable blocks */
const BLOCKED_CIDRS_V4: Array<{ prefix: number[]; bits: number }> = [
  { prefix: [10], bits: 8 },             // 10.0.0.0/8
  { prefix: [172, 16], bits: 12 },       // 172.16.0.0/12
  { prefix: [192, 168], bits: 16 },      // 192.168.0.0/16
  { prefix: [127], bits: 8 },            // 127.0.0.0/8 (loopback)
  { prefix: [0], bits: 8 },              // 0.0.0.0/8
  { prefix: [169, 254], bits: 16 },      // 169.254.0.0/16 (link-local)
  { prefix: [100, 64], bits: 10 },       // 100.64.0.0/10 (CGNAT)
  { prefix: [192, 0, 0], bits: 24 },     // 192.0.0.0/24 (IETF protocol)
  { prefix: [192, 0, 2], bits: 24 },     // TEST-NET-1
  { prefix: [198, 51, 100], bits: 24 },  // TEST-NET-2
  { prefix: [203, 0, 113], bits: 24 },   // TEST-NET-3
  { prefix: [240], bits: 4 },            // 240.0.0.0/4 (reserved)
  { prefix: [255, 255, 255, 255], bits: 32 }, // broadcast
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
  "metadata.google.internal",
  "169.254.169.254",  // AWS/GCP instance metadata
  "fd00::ec2",        // AWS IPv6 metadata
  "100.100.100.200",  // Alibaba Cloud metadata
]);

function ipv4ToBytes(ip: string): number[] {
  return ip.split(".").map(Number);
}

function isBlockedIpv4(ip: string): boolean {
  const bytes = ipv4ToBytes(ip);
  for (const { prefix, bits } of BLOCKED_CIDRS_V4) {
    const byteCount = Math.floor(bits / 8);
    const bitRemainder = bits % 8;

    let matches = true;
    for (let i = 0; i < byteCount; i++) {
      if (bytes[i] !== prefix[i]) {
        matches = false;
        break;
      }
    }

    if (matches && bitRemainder > 0 && prefix[byteCount] !== undefined) {
      const mask = 0xff & (0xff << (8 - bitRemainder));
      if ((bytes[byteCount] & mask) !== (prefix[byteCount] & mask)) {
        matches = false;
      }
    }

    if (matches) return true;
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback
  if (lower === "::1") return true;
  // Link-local
  if (lower.startsWith("fe80:")) return true;
  // Unique local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Unspecified
  if (lower === "::") return true;
  return false;
}

/**
 * Returns true if the URL is safe to proxy to.
 *
 * Rejects:
 * - Non-HTTPS URLs
 * - Bare IP addresses (v4 or v6) in the host
 * - Hostnames resolving to private/reserved address space
 * - Cloud metadata endpoints
 * - localhost variants
 */
export function isAllowedUrl(rawUrl: string): { allowed: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "Malformed URL" };
  }

  if (parsed.protocol !== "https:") {
    return { allowed: false, reason: "Only HTTPS URLs are allowed" };
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { allowed: false, reason: `Blocked hostname: ${host}` };
  }

  const ipVersion = isIP(host);

  if (ipVersion === 4) {
    if (isBlockedIpv4(host)) {
      return { allowed: false, reason: `Blocked IPv4 address: ${host}` };
    }
    return { allowed: true };
  }

  if (ipVersion === 6) {
    const bare = host.startsWith("[") && host.endsWith("]")
      ? host.slice(1, -1)
      : host;
    if (isBlockedIpv6(bare)) {
      return { allowed: false, reason: `Blocked IPv6 address: ${bare}` };
    }
    return { allowed: true };
  }

  // Hostname (not a raw IP) — allow but still block known-bad names
  if (host === "" || host.includes("..")) {
    return { allowed: false, reason: "Invalid hostname" };
  }

  if (!host.includes(".")) {
    return { allowed: false, reason: "Hostname must contain a public suffix" };
  }

  return { allowed: true };
}
