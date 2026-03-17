"use client";

// =============================================================================
// src/app/(app)/layout.tsx
// App shell: collapsible sidebar + compact top bar for all app routes.
// Wraps /app, /vault/new, /vault/dashboard.
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgent } from "@/context/AgentContext";
import { Chip } from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import BrandMark from "@/components/ui/BrandMark";
import { PUBLIC_STACKS_NETWORK } from "@/lib/public-config";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function useTheme(): { isDark: boolean; toggle: () => void } {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lend402-theme");
    setIsDark(stored !== "light");
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("lend402-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggle };
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lend402-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-slate-950" aria-hidden />;
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG — no icon library dependency)
// ---------------------------------------------------------------------------

const IconTerminal = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconPosition = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 3v18h18" />
    <polyline points="19 9 13 15 9 11 3 17" />
  </svg>
);

const IconVaults = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);

const IconPlus = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const IconDocs = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconGitHub = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.38.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12 12 0 0024 12C24 5.37 18.63 0 12 0z" />
  </svg>
);

const IconExplorer = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconChevronLeft = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconHamburger = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconSun = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx={12} cy={12} r={4} />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const IconMoon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Nav item
// ---------------------------------------------------------------------------

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  external?: boolean;
  collapsed: boolean;
  isActive: boolean;
}

function NavItem({ icon, label, href, external = false, collapsed, isActive }: NavItemProps) {
  const cls = [
    "flex items-center gap-3 rounded-lg transition-colors duration-150",
    collapsed ? "justify-center px-0 py-2 w-full" : "px-2.5 py-2",
    "font-mono text-[11px] font-medium tracking-wide",
    isActive
      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
  ].join(" ");

  const content = (
    <>
      <span className="shrink-0 w-3.5 h-3.5">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        title={collapsed ? label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} title={collapsed ? label : undefined}>
      {content}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar section label
// ---------------------------------------------------------------------------

interface SidebarSectionProps {
  label: string;
  collapsed: boolean;
}

function SidebarSection({ label, collapsed }: SidebarSectionProps) {
  if (collapsed) return <div className="my-1.5 mx-1 h-px bg-slate-800/80" />;
  return (
    <p className="px-2.5 pt-5 pb-1 font-mono text-[9px] tracking-[0.15em] text-slate-600 uppercase select-none">
      {label}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

function Sidebar({ collapsed, onToggle, className = "" }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    {
      section: "AGENT",
      items: [
        { icon: IconTerminal, label: "Command Center", href: "/app" },
        { icon: IconPosition, label: "Active Position", href: "/app#treasury" },
      ],
    },
    {
      section: "PROVIDER",
      items: [
        { icon: IconVaults, label: "My Vaults", href: "/vault/dashboard" },
        { icon: IconPlus, label: "Register Vault", href: "/vault/new" },
      ],
    },
  ];

  const resources = [
    { icon: IconDocs, label: "Docs", href: "/docs" },
    { icon: IconGitHub, label: "GitHub", href: "https://github.com/winsznx/lend402", external: true },
    { icon: IconExplorer, label: "Explorer", href: "https://explorer.hiro.so", external: true },
  ];

  return (
    <aside
      className={[
        "flex flex-col bg-[#050810] border-r border-slate-800/80 shrink-0",
        "transition-[width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-14" : "w-60",
        className,
      ].join(" ")}
    >
      {/* Logo row + collapse toggle */}
      <div
        className={[
          "h-12 flex items-center shrink-0 border-b border-slate-800/80",
          collapsed ? "justify-center px-2" : "px-3 gap-2",
        ].join(" ")}
      >
        {!collapsed && (
          <>
            <BrandMark size={16} className="rounded-md shrink-0" />
            <span className="font-mono text-[11px] font-black tracking-[0.12em] text-amber-400 uppercase truncate">
              Lend402
            </span>
            <span className="font-mono text-[9px] text-slate-600 tracking-widest hidden sm:block truncate">
              / APP
            </span>
          </>
        )}

        <button
          onClick={onToggle}
          className={[
            "flex items-center justify-center w-6 h-6 rounded-md",
            "text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors",
            collapsed ? "" : "ml-auto shrink-0",
          ].join(" ")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="w-3.5 h-3.5">
            {collapsed ? IconChevronRight : IconChevronLeft}
          </span>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col" aria-label="App navigation">
        {mainNav.map(({ section, items }) => (
          <div key={section}>
            <SidebarSection label={section} collapsed={collapsed} />
            {items.map((item) => {
              const basePath = item.href.split("#")[0];
              const isActive = basePath === "/app" ? pathname === "/app" : pathname.startsWith(basePath);
              return (
                <NavItem
                  key={item.href}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  collapsed={collapsed}
                  isActive={isActive}
                />
              );
            })}
          </div>
        ))}
      </nav>

      {/* Resources pinned to bottom */}
      <div className="p-2 border-t border-slate-800/80">
        <SidebarSection label="RESOURCES" collapsed={collapsed} />
        {resources.map((item) => (
          <NavItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            external={item.external}
            collapsed={collapsed}
            isActive={false}
          />
        ))}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

interface TopBarProps {
  onMobileToggle: () => void;
}

function TopBar({ onMobileToggle }: TopBarProps) {
  const { state, connectWallet, disconnectWallet } = useAgent();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [now, setNow] = useState("");
  const [networkOpen, setNetworkOpen] = useState(false);

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toUTCString().replace("GMT", "UTC").replace(/ \d{4} /, " "));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const chips = (
    <>
      <Chip label="CHAIN" value="NAKAMOTO" color="#a78bfa" />
      <Chip label="PROTOCOL" value="x402 V2" color="#f59e0b" />
      <Chip label="NETWORK" value={PUBLIC_STACKS_NETWORK.toUpperCase()} color="#22d3ee" live />
      <Chip label="BLOCK" value="~5S" color="#4ade80" />
    </>
  );

  return (
    <header className="shrink-0 border-b border-slate-800/60 bg-[#050810]/80 backdrop-blur-md">
      <div className="h-12 flex items-center gap-2 px-3">
        {/* Mobile hamburger — only below md where sidebar is hidden */}
        <button
          onClick={onMobileToggle}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <span className="w-4 h-4">{IconHamburger}</span>
        </button>

        {/* Status chips — visible on sm+ */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-none">
          {chips}
          {now && (
            <span className="hidden xl:block font-mono text-[9px] tabular-nums text-slate-600 ml-1 shrink-0">
              {now}
            </span>
          )}
        </div>

        {/* NETWORK toggle — visible only on xs (<sm) */}
        <button
          onClick={() => setNetworkOpen((v) => !v)}
          className="sm:hidden flex items-center gap-1 flex-1 min-w-0"
          aria-expanded={networkOpen}
          aria-label="Toggle network status"
        >
          <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
            Network
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className={`w-2.5 h-2.5 text-slate-600 transition-transform duration-150 ${networkOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Right: wallet + theme toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {state.isConnected ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: "#4ade80", boxShadow: "0 0 5px #4ade80" }}
                />
                <span className="font-mono text-[10px] font-bold text-emerald-400">
                  {state.walletAddress!.slice(0, 5)}…{state.walletAddress!.slice(-4)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnectWallet}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={connectWallet}>
              Connect Wallet
            </Button>
          )}

          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors
              border border-slate-700 bg-slate-800/60 text-slate-400
              hover:border-slate-500 hover:text-slate-200"
          >
            <span className="w-3.5 h-3.5">{isDark ? IconSun : IconMoon}</span>
          </button>
        </div>
      </div>

      {/* Mobile network panel — expands below main bar on xs only */}
      {networkOpen && (
        <div className="sm:hidden border-t border-slate-800/40 px-3 py-2.5 flex flex-wrap gap-1.5">
          {chips}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// App shell inner (consumes AgentContext — must be inside AgentProvider)
// ---------------------------------------------------------------------------

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore sidebar collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("lend402-sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("lend402-sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-mono">
      {/* Tablet sidebar — icon-only strip, visible at md but not lg */}
      <Sidebar
        collapsed={true}
        onToggle={() => {}}
        className="hidden md:flex lg:hidden"
      />

      {/* Desktop sidebar — user-controlled collapse, visible at lg+ */}
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        className="hidden lg:flex"
      />

      {/* Mobile drawer — only below md */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMobile}
            aria-hidden
          />
          {/* Drawer panel */}
          <div className="relative flex">
            <Sidebar collapsed={false} onToggle={closeMobile} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMobileToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppShellInner>{children}</AppShellInner>
    </ThemeProvider>
  );
}
