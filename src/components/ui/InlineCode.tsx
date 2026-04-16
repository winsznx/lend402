interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export default function InlineCode({ children, className = "" }: InlineCodeProps) {
  return (
    <code className={"rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200 " + className}>
      {children}
    </code>
  );
}
