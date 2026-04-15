"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Dialog({ open, onClose, title, children, className = "" }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`mx-4 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl ${className}`}
      >
        {title && (
          <h2 className="mb-4 font-mono text-sm font-bold uppercase tracking-widest text-slate-200">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
