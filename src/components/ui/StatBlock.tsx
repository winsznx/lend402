interface StatBlockProps {
  label: string;
  value: string | number;
  accent?: string;
  className?: string;
}

export default function StatBlock({ label, value, accent, className = "" }: StatBlockProps) {
  return (
    <div className={"flex flex-col " + className}>
      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  );
}
