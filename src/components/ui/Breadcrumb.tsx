interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

interface BreadcrumbProps {
  readonly items: BreadcrumbItem[];
  readonly className?: string;
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1 ${className}`}>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && (
            <span className="font-mono text-[10px] text-slate-600">/</span>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 hover:underline"
            >
              {item.label}
            </a>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
