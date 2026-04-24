interface SkeletonProps {
  readonly className?: string;
  readonly width?: string;
  readonly height?: string;
}

export default function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}
