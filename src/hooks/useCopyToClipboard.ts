import { useCallback, useState } from "react";

export function useCopyToClipboard(
  resetMs: number = 2000
): { copied: boolean; copy: (text: string) => Promise<void> } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs]
  );

  return { copied, copy };
}
