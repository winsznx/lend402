import Badge from "./Badge";
import type { Caip2NetworkId } from "@/types/x402";

interface NetworkBadgeProps {
  readonly network: Caip2NetworkId;
  readonly className?: string;
}

export default function NetworkBadge({ network, className = "" }: NetworkBadgeProps) {
  const label = network === "stacks:1" ? "MAINNET" : "TESTNET";
  const variant = network === "stacks:1" ? "success" : "warning";
  return <Badge variant={variant} className={className}>{label}</Badge>;
}
