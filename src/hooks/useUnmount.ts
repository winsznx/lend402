import { useEffect, useRef } from "react";

export function useUnmount(fn: () => void): void {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);

  useEffect(() => () => saved.current(), []);
}
