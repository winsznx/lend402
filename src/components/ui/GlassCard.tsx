"use client";

// =============================================================================
// src/components/ui/GlassCard.tsx
// Glassmorphism panel — adapts to dark and light mode via Tailwind dark: modifier.
// Dark: frosted dark glass with subtle white rim.
// Light: frosted white glass with drop shadow.
// =============================================================================

import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Optional accent glow. Pass a hex/rgba color to add a tinted inner ring. */
  accentColor?: string;
  /** If true, renders without rounded corners (e.g. for full-bleed sections). */
  flush?: boolean;
  as?: React.ElementType;
}

export default function GlassCard({
  children,
  className = "",
  accentColor,
  flush = false,
  as: Tag = "div",
}: GlassCardProps) {
  const borderRadius = flush ? "" : "rounded-xl";

  return (
    <Tag
      className={[
        "relative overflow-hidden",
        // Glass background
        "bg-white/60 dark:bg-slate-900/50",
        // Backdrop blur
        "backdrop-blur-xl",
        // Border
        "border border-slate-200/70 dark:border-slate-700/30",
        // Light mode shadow
        "shadow-sm dark:shadow-none",
        borderRadius,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        accentColor
          ? {
              boxShadow: `inset 0 1px 0 ${accentColor}20, 0 0 28px ${accentColor}0a`,
            }
          : undefined
      }
    >
      {/* Glass inner highlight — visible only in dark */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] dark:opacity-100 opacity-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)",
        }}
        aria-hidden
      />
      {children}
    </Tag>
  );
}
