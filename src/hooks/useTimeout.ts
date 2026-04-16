import { useEffect, useRef } from "react";

export function useTimeout(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback);

  useEffect(() => { saved.current = callback; }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setTimeout(() => saved.current(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
}
