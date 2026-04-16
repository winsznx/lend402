export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const { timeoutMs = 10_000, ...rest } = init ?? {};
  const response = await fetch(input, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error("HTTP " + response.status + " " + response.statusText + (body ? ": " + body : ""));
  }

  return (await response.json()) as T;
}
