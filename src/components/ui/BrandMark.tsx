import Image from "next/image";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export default function BrandMark({
  size = 28,
  className = "",
}: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 p-1.5 dark:border-amber-400/20 dark:bg-amber-400/8 ${className}`.trim()}
    >
      <Image
        src="/favicon.svg"
        alt="Lend402 mark"
        width={size}
        height={size}
        priority
        className="block"
      />
    </span>
  );
}
