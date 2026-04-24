"use client";

// =============================================================================
// src/components/ui/Chip.tsx
// Protocol/network status chip — compact label + value display.
// Used in the header, metrics bar, and terminal status bar.
// =============================================================================

import React from "react";

interface ChipProps {
  readonly label: string;
  readonly value: string;
  /** Accent hex color for the value text */
  readonly color: string;
  /** If true, shows a pulsing dot before the label */
  readonly live?: boolean;
  readonly className?: string;
}

export function Chip({ label, value, color, live, className = "" }: ChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {live && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
        />
      )}
      <span className="font-mono text-[10px] tracking-widest text-slate-500 dark:text-slate-500 uppercase">
        {label}
      </span>
      <span
        className="font-mono text-[10px] tracking-widest font-bold uppercase"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// Bordered pill variant for richer context
interface PillProps {
  readonly label: string;
  readonly color: string;
  readonly live?: boolean;
  readonly className?: string;
}

export function Pill({ label, color, live, className = "" }: PillProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] tracking-widest font-bold uppercase ${className}`}
      style={{
        color,
        background: `${color}14`,
        border: `1px solid ${color}30`,
      }}
    >
      {live && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </div>
  );
}
