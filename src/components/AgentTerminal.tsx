"use client";

// =============================================================================
// src/components/AgentTerminal.tsx
// Live SSE event stream rendered as a CRT terminal.
//
// Design:
//   - Always-dark aesthetic regardless of page theme (it's a terminal).
//   - Smooth per-line enter animation: CSS @keyframes on first mount (by key).
//     React creates a new DOM node per unique line.id key — animation auto-fires
//     on mount, zero JS tracking needed, zero flicker.
//   - CRT scanline + phosphor glow effects.
//   - Phase indicator with colored pulse dots.
// =============================================================================

import React, { useEffect, useRef } from "react";
import { useAgent, TerminalLine, AgentPhase } from "@/context/AgentContext";
import { PUBLIC_CAIP2_NETWORK } from "@/lib/public-config";

// ---------------------------------------------------------------------------
// TIME FORMATTER
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const d = new Date(ms);
  return [
    d.getHours().toString().padStart(2, "0"),
    d.getMinutes().toString().padStart(2, "0"),
    d.getSeconds().toString().padStart(2, "0"),
  ].join(":") + "." + d.getMilliseconds().toString().padStart(3, "0");
}

// ---------------------------------------------------------------------------
// PHASE CONFIG
// ---------------------------------------------------------------------------

const PHASE_CONFIG: Record<AgentPhase, { label: string; color: string; pulse: boolean }> = {
  IDLE:         { label: "STANDBY",     color: "#64748b", pulse: false },
  REQUESTING:   { label: "REQUESTING",  color: "#f59e0b", pulse: true  },
  INTERCEPTED:  { label: "402 CAUGHT",  color: "#f97316", pulse: true  },
  SIMULATING:   { label: "SIMULATING",  color: "#f59e0b", pulse: true  },
  BUILDING:     { label: "BUILDING TX", color: "#a78bfa", pulse: false },
  SIGNING:      { label: "SIGNING",     color: "#818cf8", pulse: false },
  BROADCASTING: { label: "BROADCAST",   color: "#22d3ee", pulse: true  },
  CONFIRMING:   { label: "CONFIRMING",  color: "#22d3ee", pulse: true  },
  CONFIRMED:    { label: "CONFIRMED ✓", color: "#4ade80", pulse: false },
  ERROR:        { label: "ERROR",       color: "#f87171", pulse: false },
};

// ---------------------------------------------------------------------------
// TERMINAL LINE STYLES
// ---------------------------------------------------------------------------

const LEVEL_STYLE: Record<
  TerminalLine["level"],
  { text: string; prefix: string; bg?: string; glow?: string }
> = {
  system:  { text: "#64748b", prefix: "──", bg: undefined,   glow: undefined     },
  info:    { text: "#94a3b8", prefix: "  ", bg: undefined,   glow: undefined     },
  warn:    { text: "#fbbf24", prefix: "▲▲", bg: "#fbbf2408", glow: "#fbbf240f"   },
  success: { text: "#4ade80", prefix: "██", bg: "#4ade8008", glow: "#4ade800f"   },
  error:   { text: "#f87171", prefix: "!!", bg: "#f8717108", glow: "#f871710f"   },
  confirm: { text: "#22d3ee", prefix: "◆◆", bg: "#22d3ee08", glow: "#22d3ee0f"  },
};

// ---------------------------------------------------------------------------
// TERMINAL LINE ITEM
// The `key={line.id}` on the parent list ensures each new line gets a fresh
// DOM node, so the CSS enter animation fires exactly once with no JS tracking.
// ---------------------------------------------------------------------------

function TerminalLineItem({ line }: { line: TerminalLine }) {
  const s = LEVEL_STYLE[line.level];

  return (
    <div
      className="flex gap-2.5 py-[3px] px-2 rounded-sm terminal-line-enter"
      style={{ backgroundColor: s.bg }}
    >
      {/* Timestamp */}
      <span
        className="font-mono text-[11px] shrink-0 select-none tabular-nums"
        style={{ color: "#1e3a5f", minWidth: "80px" }}
      >
        {formatTime(line.timestamp)}
      </span>

      {/* Level prefix */}
      <span
        className="font-mono text-[11px] shrink-0 select-none"
        style={{ color: s.text, opacity: 0.5, minWidth: "18px" }}
        aria-hidden
      >
        {s.prefix}
      </span>

      {/* Message */}
      <span
        className="font-mono text-[11px] leading-relaxed break-all"
        style={{ color: s.text }}
      >
        {line.text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PHASE INDICATOR DOT + LABEL
// ---------------------------------------------------------------------------

function PhaseIndicator({ phase }: { phase: AgentPhase }) {
  const { label, color, pulse } = PHASE_CONFIG[phase];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span
        className="font-mono text-[10px] font-black tracking-widest uppercase"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STATUS PILL (bottom bar)
// ---------------------------------------------------------------------------

function StatusPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] tracking-widest text-slate-600 uppercase">{label}</span>
      <span className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRT OVERLAY — scanlines + moving beam
// ---------------------------------------------------------------------------

function CRTOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden" aria-hidden>
      {/* Static scanlines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 4px)",
        }}
      />
      {/* Phosphor vignette */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      {/* Moving scan beam */}
      <div
        className="absolute left-0 right-0 h-px opacity-10 crt-scanbeam"
        style={{
          background:
            "linear-gradient(90deg, transparent, #22d3ee 25%, #22d3ee 75%, transparent)",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BLINKING CURSOR
// ---------------------------------------------------------------------------

function Cursor() {
  return (
    <span
      className="inline-block w-2 h-3.5 ml-0.5 align-middle cursor-blink"
      style={{ backgroundColor: "#22d3ee" }}
    />
  );
}

// ---------------------------------------------------------------------------
// MAIN TERMINAL COMPONENT
// ---------------------------------------------------------------------------

export default function AgentTerminal() {
  const { state } = useAgent();
  const { terminalLines, phase } = state;
  const viewportRef  = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(terminalLines.length);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (terminalLines.length !== prevCountRef.current) {
      prevCountRef.current = terminalLines.length;
      const vp = viewportRef.current;
      if (vp) {
        vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
      }
    }
  }, [terminalLines]);

  const isActive = phase !== "IDLE" && phase !== "CONFIRMED" && phase !== "ERROR";

  return (
    <section
      className="relative flex flex-col rounded-xl overflow-hidden"
      style={{
        // Always dark — terminal never adapts to light mode
        background: "linear-gradient(160deg, #090e1a 0%, #050810 100%)",
        border: "1px solid rgba(30,41,59,0.8)",
        boxShadow: [
          "0 0 0 1px rgba(15,23,42,0.5)",
          "0 20px 60px rgba(0,0,0,0.6)",
          "inset 0 1px 0 rgba(255,255,255,0.03)",
        ].join(", "),
        minHeight: "420px",
      }}
    >
      <CRTOverlay />

      {/* ── Title bar ── */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{
          borderBottom: "1px solid rgba(30,41,59,0.8)",
          background: "rgba(10,15,26,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* macOS-style traffic lights */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="font-mono text-[10px] tracking-widest text-slate-600">
            AGENT ACTIVITY LOG — lend402::borrow-and-pay
          </span>
        </div>

        {/* Phase + line count */}
        <div className="flex items-center gap-4">
          <PhaseIndicator phase={phase} />
          <span className="font-mono text-[10px] tabular-nums text-slate-700">
            {terminalLines.length} lines
          </span>
        </div>
      </div>

      {/* ── Log viewport ── */}
      <div
        ref={viewportRef}
        className="relative z-10 flex-1 overflow-y-auto py-2 scroll-smooth"
        style={{
          maxHeight: "400px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(30,41,59,0.8) transparent",
        }}
      >
        {terminalLines.map((line) => (
          <TerminalLineItem key={line.id} line={line} />
        ))}

        {/* Prompt + cursor */}
        <div className="px-2 pt-1.5 pb-0.5">
          <span className="font-mono text-[11px] text-slate-700">
            agent@lend402:~${" "}
          </span>
          {isActive && <Cursor />}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          borderTop: "1px solid rgba(30,41,59,0.8)",
          background: "rgba(10,15,26,0.70)",
        }}
      >
        <div className="flex items-center gap-4">
          <StatusPill label="NETWORK" value={PUBLIC_CAIP2_NETWORK} color="#a78bfa" />
          <StatusPill label="BLOCK"   value="~5s"               color="#22d3ee" />
          <StatusPill label="PROTO"   value="x402 V2"           color="#f59e0b" />
        </div>
        <span className="font-mono text-[9px] tracking-widest text-slate-800 uppercase">
          Nakamoto Release
        </span>
      </div>

      {/* ── Keyframe definitions ── */}
      <style>{`
        .terminal-line-enter {
          animation: terminalLineIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes terminalLineIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cursor-blink {
          animation: cursorBlink 1.1s step-end infinite;
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        .crt-scanbeam {
          animation: scanBeam 5s linear infinite;
        }
        @keyframes scanBeam {
          from { top: -2px;   }
          to   { top: 100%;   }
        }
      `}</style>
    </section>
  );
}
