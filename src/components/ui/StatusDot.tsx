type Status = "online" | "offline" | "warning" | "error";

interface StatusDotProps {
  readonly status: Status;
  readonly label?: string;
  readonly className?: string;
}

const COLOR_MAP: Record<Status, string> = {
  online: "bg-emerald-400",
  offline: "bg-slate-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
};

export default function StatusDot({ status, label, className = "" }: StatusDotProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${COLOR_MAP[status]} ${status === "online" ? "animate-pulse" : ""}`} />
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {label}
        </span>
      )}
    </span>
  );
}
