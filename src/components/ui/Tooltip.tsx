"use client";

import { useState, type ReactNode } from "react";

interface TooltipProps {
  readonly content: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export default function Tooltip({ content, children, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[10px] text-slate-200 shadow-lg"
        >
          {content}
        </span>
      )}
    </span>
  );
}
