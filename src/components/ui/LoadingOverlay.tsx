"use client";

import Spinner from "@/components/ui/Spinner";

interface LoadingOverlayProps {
  readonly visible: boolean;
  readonly message?: string;
  readonly className?: string;
}

export default function LoadingOverlay({ visible, message, className = "" }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className={"absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 " + className}>
      <Spinner size="lg" className="text-cyan-400" />
      {message && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{message}</p>
      )}
    </div>
  );
}
