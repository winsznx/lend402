export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  intervalMs: number
): T {
  let lastCall = 0;

  return ((...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}
