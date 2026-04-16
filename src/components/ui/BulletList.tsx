interface BulletListProps {
  items: React.ReactNode[];
  className?: string;
}

export default function BulletList({ items, className = "" }: BulletListProps) {
  return (
    <ul className={"flex flex-col gap-1.5 " + className}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 font-mono text-xs text-slate-700 dark:text-slate-300">
          <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
