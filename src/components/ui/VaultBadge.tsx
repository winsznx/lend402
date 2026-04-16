import Badge from "./Badge";

interface VaultBadgeProps {
  active: boolean;
  className?: string;
}

export default function VaultBadge({ active, className = "" }: VaultBadgeProps) {
  return (
    <Badge variant={active ? "success" : "default"} className={className}>
      {active ? "ACTIVE" : "PAUSED"}
    </Badge>
  );
}
