export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = init ?? {};
  return fetch(input, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs),
  });
}
