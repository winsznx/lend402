interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDING_MAP = { none: "", sm: "p-3", md: "p-5", lg: "p-7" } as const;

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 ${PADDING_MAP[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
