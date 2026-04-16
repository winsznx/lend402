import { describe, it, expect } from "vitest";
import { buildGatewayProxyUrl, extractVaultIdFromGatewayUrl } from "../../src/lib/gateway-url";

describe("buildGatewayProxyUrl", () => {
  it("builds base", () => {
    expect(buildGatewayProxyUrl("https://gw.lend402.xyz", "abc")).toBe("https://gw.lend402.xyz/v/abc");
  });
  it("appends subpath", () => {
    expect(buildGatewayProxyUrl("https://gw.lend402.xyz/", "abc", "/status")).toBe("https://gw.lend402.xyz/v/abc/status");
  });
});

describe("extractVaultIdFromGatewayUrl", () => {
  it("extracts id", () => {
    expect(extractVaultIdFromGatewayUrl("https://gw.lend402.xyz/v/abc-123/foo")).toBe("abc-123");
  });
  it("returns null if missing", () => {
    expect(extractVaultIdFromGatewayUrl("https://gw.lend402.xyz/other")).toBeNull();
  });
});
