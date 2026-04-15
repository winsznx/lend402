"use client";

import CopyButton from "@/components/ui/CopyButton";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlock({ code, language, className = "" }: CodeBlockProps) {
  return (
    <div className={`group relative rounded-lg border border-slate-800 bg-slate-950 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        {language && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
            {language}
          </span>
        )}
        <CopyButton text={code} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-xs text-slate-300">{code}</code>
      </pre>
    </div>
  );
}
