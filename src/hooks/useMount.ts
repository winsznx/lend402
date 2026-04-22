import { useEffect } from "react";

export function useMount(fn: () => void | (() => void)): void {

  useEffect(() => { return fn(); }, []);
}
