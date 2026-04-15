interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export default function Kbd({ children, className = "" }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 ${className}`}
    >
      {children}
    </kbd>
  );
}
