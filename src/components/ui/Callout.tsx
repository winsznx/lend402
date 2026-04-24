interface CalloutProps {
  readonly children: React.ReactNode;
  readonly title?: string;
  readonly color?: string;
  readonly className?: string;
}

export default function Callout({ children, title, color = "#22d3ee", className = "" }: CalloutProps) {
  return (
    <div
      className={"rounded-lg border-l-2 bg-slate-50 p-4 dark:bg-slate-900/60 " + className}
      style={{ borderLeftColor: color }}
    >
      {title && (
        <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {title}
        </p>
      )}
      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}
