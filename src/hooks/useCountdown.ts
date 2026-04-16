import { useEffect, useState } from "react";

export function useCountdown(targetUnix: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, targetUnix - Math.floor(Date.now() / 1000)));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const next = Math.max(0, targetUnix - Math.floor(Date.now() / 1000));
      setRemaining(next);
    }, 1000);
    return () => clearInterval(id);
  }, [targetUnix, remaining]);

  return remaining;
}
