interface AlertProps {
  readonly variant?: "info" | "success" | "warning" | "error";
  readonly title?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<NonNullable<AlertProps["variant"]>, string> = {
  info: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
  warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
};

export default function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg border px-4 py-3 font-mono text-xs ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {title && <p className="mb-1 font-bold uppercase tracking-widest text-[10px]">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
