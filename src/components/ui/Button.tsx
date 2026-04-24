"use client";

// =============================================================================
// src/components/ui/Button.tsx
// Neo-brutalist primary button with glassmorphism secondary variant.
//
// Dark mode:  Glass fill + colored border + hard offset shadow in accent color.
// Light mode: Solid fill + black border + hard black offset shadow.
// =============================================================================

import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly loading?: boolean;
  readonly accentColor?: string; // override default accent
  readonly children: React.ReactNode;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-xs",
  lg: "px-7 py-3.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "relative inline-flex items-center justify-center gap-2.5 font-mono font-bold tracking-[0.08em] uppercase transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500";

  const variantClasses: Record<Variant, string> = {
    // Neo-brutalist primary
    primary: [
      // Light: solid bg + black border + hard black shadow
      "bg-cyan-400 border-2 border-slate-950 text-slate-950",
      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
      "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      // Dark: glass fill + cyan border + hard cyan shadow
      "dark:bg-cyan-500/10 dark:border-cyan-400 dark:text-cyan-300",
      "dark:shadow-[3px_3px_0px_0px_rgba(34,211,238,0.40)]",
      "dark:hover:-translate-x-0.5 dark:hover:-translate-y-0.5 dark:hover:shadow-[4px_4px_0px_0px_rgba(34,211,238,0.50)]",
      "dark:active:translate-x-0.5 dark:active:translate-y-0.5 dark:active:shadow-none",
    ].join(" "),

    secondary: [
      // Light: white bg + dark border
      "bg-white border-2 border-slate-900 text-slate-900",
      "shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]",
      "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]",
      "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      // Dark: transparent bg + muted border
      "dark:bg-transparent dark:border-slate-600 dark:text-slate-400",
      "dark:shadow-none dark:hover:border-slate-400 dark:hover:text-slate-200",
    ].join(" "),

    danger: [
      "bg-red-400 border-2 border-slate-950 text-slate-950",
      "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]",
      "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      "dark:bg-red-500/10 dark:border-red-400 dark:text-red-300",
      "dark:shadow-[3px_3px_0px_0px_rgba(248,113,113,0.40)]",
      "dark:hover:shadow-[4px_4px_0px_0px_rgba(248,113,113,0.50)] dark:hover:-translate-x-0.5 dark:hover:-translate-y-0.5",
      "dark:active:translate-x-0.5 dark:active:translate-y-0.5 dark:active:shadow-none",
    ].join(" "),

    ghost: [
      "bg-transparent border border-slate-300 text-slate-700",
      "hover:bg-slate-100 hover:border-slate-400",
      "dark:border-slate-700 dark:text-slate-400",
      "dark:hover:border-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/50",
    ].join(" "),
  };

  const disabledClasses = isDisabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "cursor-pointer";

  const rounded = "rounded-lg";

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        base,
        SIZE_CLASSES[size],
        variantClasses[variant],
        disabledClasses,
        rounded,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && <SpinnerIcon />}
      {children}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
      <path d="M22 12a10 10 0 00-10-10" strokeLinecap="round" />
    </svg>
  );
}
