import { useEffect } from "react";

export function useMount(fn: () => void | (() => void)): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { return fn(); }, []);
}
