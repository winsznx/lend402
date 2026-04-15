interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-8 h-8" } as const;

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${SIZE_MAP[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
      <path d="M22 12a10 10 0 00-10-10" strokeLinecap="round" />
    </svg>
  );
}
