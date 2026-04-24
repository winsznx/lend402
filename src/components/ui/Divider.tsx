interface DividerProps {
  readonly className?: string;
  readonly label?: string;
}

export default function Divider({ className = "", label }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600">
          {label}
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }
  return <hr className={`border-t border-slate-200 dark:border-slate-800 ${className}`} />;
}
