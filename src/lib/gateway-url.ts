import { stripTrailingSlash } from "./network";

export function buildGatewayProxyUrl(baseUrl: string, vaultId: string, subPath: string = ""): string {
  const clean = stripTrailingSlash(baseUrl);
  const suffix = subPath.replace(/^\/+/, "");
  return suffix ? clean + "/v/" + vaultId + "/" + suffix : clean + "/v/" + vaultId;
}

export function extractVaultIdFromGatewayUrl(url: string): string | null {
  const match = /\/v\/([^/?#]+)/.exec(url);
  return match ? match[1] : null;
}
