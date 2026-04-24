"use client";

import { truncateMiddle } from "@/lib/format";
import { getExplorerTxUrl } from "@/lib/public-config";

interface TxidLinkProps {
  readonly txid: string;
  readonly className?: string;
  readonly maxLen?: number;
}

export default function TxidLink({ txid, className = "", maxLen = 14 }: TxidLinkProps) {
  return (
    <a
      href={getExplorerTxUrl(txid)}
      target="_blank"
      rel="noopener noreferrer"
      className={"font-mono text-xs text-cyan-400 underline decoration-dotted underline-offset-2 hover:text-cyan-300 " + className}
    >
      {truncateMiddle(txid, maxLen)}
    </a>
  );
}
