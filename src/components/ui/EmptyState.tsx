interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly children?: React.ReactNode;
  readonly className?: string;
}

export default function EmptyState({ title, description, children, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <p className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">
        {title}
      </p>
      {description && (
        <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-500">
          {description}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
