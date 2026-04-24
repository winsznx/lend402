"use client";

import { truncateAddress } from "@/lib/address";
import { buildExplorerAddressUrl } from "@/lib/url";
import { PUBLIC_HIRO_EXPLORER_BASE_URL, PUBLIC_STACKS_NETWORK } from "@/lib/public-config";

interface AddressLinkProps {
  readonly address: string;
  readonly truncate?: boolean;
  readonly className?: string;
}

export default function AddressLink({ address, truncate = true, className = "" }: AddressLinkProps) {
  const url = buildExplorerAddressUrl(PUBLIC_HIRO_EXPLORER_BASE_URL, address, PUBLIC_STACKS_NETWORK);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={"font-mono text-xs text-cyan-400 underline decoration-dotted underline-offset-2 hover:text-cyan-300 " + className}
    >
      {truncate ? truncateAddress(address) : address}
    </a>
  );
}
