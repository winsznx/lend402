interface ProgressBarProps {
  readonly value: number;
  readonly max?: number;
  readonly className?: string;
  readonly color?: string;
}

export default function ProgressBar({ value, max = 100, className = "", color }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div
        className="h-full rounded-full bg-cyan-400 transition-all duration-300"
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}
