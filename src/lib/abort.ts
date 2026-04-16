export function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      break;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}

export function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
