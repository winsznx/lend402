"use client";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

interface CopyButtonProps {
  readonly text: string;
  readonly className?: string;
  readonly label?: string;
}

export default function CopyButton({ text, className = "", label = "Copy" }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={`inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
