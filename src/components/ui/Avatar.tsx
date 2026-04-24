interface AvatarProps {
  readonly address: string;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const SIZE_MAP = { sm: "w-6 h-6 text-[8px]", md: "w-8 h-8 text-[10px]", lg: "w-10 h-10 text-xs" } as const;

function addressToHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export default function Avatar({ address, size = "md", className = "" }: AvatarProps) {
  const hue = addressToHue(address);
  const initials = address.slice(0, 2).toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mono font-bold ${SIZE_MAP[size]} ${className}`}
      style={{
        backgroundColor: `hsl(${hue}, 60%, 25%)`,
        color: `hsl(${hue}, 60%, 70%)`,
      }}
      title={address}
    >
      {initials}
    </span>
  );
}
