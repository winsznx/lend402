import Badge from "@/components/ui/Badge";

interface VaultBadgeProps {
  readonly active: boolean;
  readonly className?: string;
}

export default function VaultBadge({ active, className = "" }: VaultBadgeProps) {
  return (
    <Badge variant={active ? "success" : "default"} className={className}>
      {active ? "ACTIVE" : "PAUSED"}
    </Badge>
  );
}
