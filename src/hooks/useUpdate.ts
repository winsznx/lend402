import { useCallback, useState } from "react";

export function useUpdate(): () => void {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}
