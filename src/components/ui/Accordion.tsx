"use client";

import { useState, type ReactNode } from "react";

interface AccordionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly defaultOpen?: boolean;
  readonly className?: string;
}

export default function Accordion({ title, children, defaultOpen = false, className = "" }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={"rounded-lg border border-slate-200 dark:border-slate-800 " + className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        <span>{title}</span>
        <span className={"transition-transform " + (open ? "rotate-90" : "")}>{">"}</span>
      </button>
      {open && <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">{children}</div>}
    </div>
  );
}
