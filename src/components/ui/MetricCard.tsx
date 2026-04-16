interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  className?: string;
}

export default function MetricCard({ label, value, delta, className = "" }: MetricCardProps) {
  return (
    <div className={"rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80 " + className}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {delta && (
        <p className={"mt-1 font-mono text-[10px] " + (delta.positive ? "text-emerald-500" : "text-red-500")}>
          {delta.positive ? "+" : ""}{delta.value}
        </p>
      )}
    </div>
  );
}
