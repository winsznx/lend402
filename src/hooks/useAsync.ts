import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: ReadonlyArray<unknown> = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => { if (mounted.current) setState({ data, error: null, loading: false }); })
      .catch((error: Error) => { if (mounted.current) setState({ data: null, error, loading: false }); });

  }, deps);

  useEffect(() => { run(); }, [run]);

  return { ...state, refetch: run };
}
