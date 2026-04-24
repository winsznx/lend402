"use client";

// =============================================================================
// src/app/(docs)/layout.tsx
// Docs shell: sticky top bar + left nav sidebar + right on-page outline.
// Three-column on desktop (≥1280px), two-column on tablet (768-1280px),
// collapsing drawer on mobile (<768px).
// =============================================================================

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/ui/BrandMark";

// ---------------------------------------------------------------------------
// Nav data
// ---------------------------------------------------------------------------

const LEFT_NAV = [
  { id: "overview",       label: "Overview" },
  { id: "how-it-works",   label: "How It Works" },
  { id: "stacks-alignment", label: "Stacks Alignment" },
  { id: "security",       label: "Security" },
  { id: "deployment",     label: "Deployment" },
  { id: "api-reference",  label: "API Reference" },
  { id: "judging",        label: "Judging Criteria",  distinct: true },
  { id: "truthful-status", label: "Truthful Status" },
] as const;

const RIGHT_OUTLINE = [
  { id: "overview",        label: "Overview" },
  { id: "pitch",           label: "One-Sentence Pitch" },
  { id: "how-it-works",    label: "How It Works" },
  { id: "sequence",        label: "Sequence Diagram" },
  { id: "stacks-alignment", label: "Stacks Alignment" },
  { id: "component-map",   label: "Component Map" },
  { id: "security",        label: "Security Controls" },
  { id: "deployment",      label: "Deployment" },
  { id: "repo-map",        label: "Repository Map" },
  { id: "api-reference",   label: "API Reference" },
  { id: "judging",         label: "Judging Criteria" },
  { id: "truthful-status", label: "Truthful Status" },
] as const;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const IconMenu = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconClose = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ---------------------------------------------------------------------------
// Left sidebar nav item
// ---------------------------------------------------------------------------

interface NavItemProps {
  readonly id: string;
  readonly label: string;
  readonly distinct?: boolean;
  readonly isActive: boolean;
}

function NavItem({ id, label, distinct = false, isActive }: NavItemProps) {
  return (
    <a
      href={`#${id}`}
      className={[
        "block px-3 py-1.5 rounded-lg font-mono text-[11px] font-medium tracking-wide transition-colors",
        distinct
          ? isActive
            ? "bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30"
            : "bg-amber-400/8 text-amber-700 dark:text-amber-500 hover:bg-amber-400/15 hover:text-amber-600 dark:hover:text-amber-400 border border-amber-400/20"
          : isActive
          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
          : "text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Left sidebar
// ---------------------------------------------------------------------------

function LeftSidebar({ activeSection, className = "" }: { activeSection: string; className?: string }) {
  return (
    <aside className={`w-[220px] shrink-0 ${className}`}>
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pr-4">
        <p className="px-3 pb-3 font-mono text-[9px] tracking-[0.18em] text-slate-400 dark:text-slate-600 uppercase">
          Documentation
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Docs navigation">
          {LEFT_NAV.map((item) => (
            <React.Fragment key={item.id}>
              {"distinct" in item && item.distinct && (
                <div className="my-1.5 mx-3 h-px bg-slate-200 dark:bg-slate-800" />
              )}
              <NavItem
                id={item.id}
                label={item.label}
                distinct={"distinct" in item && item.distinct}
                isActive={activeSection === item.id}
              />
            </React.Fragment>
          ))}
        </nav>

        <div className="mt-6 px-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="pb-2 font-mono text-[9px] tracking-[0.18em] text-slate-400 dark:text-slate-600 uppercase">External</p>
          <div className="flex flex-col gap-1">
            <a href="https://github.com/winsznx/lend402" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
              GitHub ↗
            </a>
            <a href="https://explorer.hiro.so" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
              Hiro Explorer ↗
            </a>
            <a href="https://docs.stacks.co" target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors">
              Stacks Docs ↗
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Right sidebar (on-page outline)
// ---------------------------------------------------------------------------

function RightSidebar({ activeSection, className = "" }: { activeSection: string; className?: string }) {
  return (
    <aside className={`w-[180px] shrink-0 ${className}`}>
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pl-4">
        <p className="pb-2 font-mono text-[9px] tracking-[0.18em] text-slate-400 dark:text-slate-600 uppercase">
          On this page
        </p>
        <nav className="flex flex-col gap-0.5" aria-label="Page outline">
          {RIGHT_OUTLINE.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={[
                "block py-1 font-mono text-[10px] leading-snug transition-colors",
                activeSection === item.id
                  ? "text-cyan-600 dark:text-cyan-400 font-bold"
                  : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300",
              ].join(" ")}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile drawer
// ---------------------------------------------------------------------------

function MobileDrawer({ open, onClose, activeSection }: { open: boolean; onClose: () => void; activeSection: string }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="absolute top-14 left-0 right-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-xl max-h-[70vh] overflow-y-auto">
        <div className="p-4">
          <p className="pb-2 font-mono text-[9px] tracking-[0.18em] text-slate-400 dark:text-slate-600 uppercase">
            Sections
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {LEFT_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={onClose}
                className={[
                  "block px-3 py-2 rounded-lg font-mono text-[11px] font-medium tracking-wide transition-colors",
                  "distinct" in item && item.distinct
                    ? "bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-400/25"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800",
                ].join(" ")}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection] = useState("overview");

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // pathname is available for future multi-page docs expansion
  void pathname;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-[11px] font-black tracking-[0.12em] text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              <BrandMark size={18} className="rounded-lg border-0 bg-transparent p-0" />
              <span>LEND402</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
              Docs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/vault/new"
                className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                Register API
              </Link>
              <Link
                href="/app"
                className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                App
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? IconClose : IconMenu}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      <MobileDrawer open={mobileOpen} onClose={closeMobile} activeSection={activeSection} />

      {/* ── Three-column body ── */}
      <div className="mx-auto flex max-w-screen-xl">
        {/* Left sidebar — tablet+  */}
        <LeftSidebar activeSection={activeSection} className="hidden md:block" />

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Right sidebar — desktop only (≥1280px) */}
        <RightSidebar activeSection={activeSection} className="hidden xl:block" />
      </div>
    </div>
  );
}
