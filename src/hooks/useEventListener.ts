import { useEffect, useRef } from "react";

export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  target: Window | Document | HTMLElement | null = typeof window !== "undefined" ? window : null
): void {
  const saved = useRef(handler);
  useEffect(() => { saved.current = handler; }, [handler]);

  useEffect(() => {
    if (!target) return;
    const listener = (e: Event) => saved.current(e as WindowEventMap[K]);
    target.addEventListener(event, listener);
    return () => target.removeEventListener(event, listener);
  }, [event, target]);
}
