import Link from "next/link";
import React from "react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#050810] text-slate-300 selection:bg-cyan-500/25">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#050810]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Wordmark */}
          <Link href="/" className="text-xl font-bold tracking-wider text-slate-100 uppercase">
            Lend402
          </Link>

          {/* Right: Navigation & CTAs */}
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link href="/docs" className="hidden sm:block text-slate-400 hover:text-slate-200 transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/winsznx/lend402"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:block text-slate-400 hover:text-slate-200 transition-colors"
            >
              GitHub
            </a>
            
            <div className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-slate-800 sm:pl-6 sm:ml-2">
              <Link
                href="/vault/new"
                className="rounded-md border border-slate-700 px-3 sm:px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-xs sm:text-sm whitespace-nowrap"
              >
                Register API
              </Link>
              <Link
                href="/app"
                className="rounded-md bg-cyan-600 px-3 sm:px-4 py-2 text-white font-medium hover:bg-cyan-500 transition-colors shadow-[0_0_15px_rgba(8,145,178,0.4)] text-xs sm:text-sm whitespace-nowrap"
              >
                Launch App
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090e1a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-xs flex flex-col gap-3">
            <span className="text-lg font-bold tracking-wider text-slate-100 uppercase">
              Lend402
            </span>
            <p className="text-sm text-slate-500 leading-relaxed">
              x402 payment + JIT credit for agentic APIs on Stacks.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-x-12 gap-y-8">
            <div className="flex flex-col gap-3">
              <h4 className="text-slate-100 font-semibold mb-2">Resources</h4>
              <Link href="/docs" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Docs</Link>
              <a href="https://github.com/winsznx/lend402" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">GitHub</a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-slate-100 font-semibold mb-2">Ecosystem</h4>
              <a href="https://explorer.hiro.so" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Hiro Explorer</a>
              <a href="https://docs.stacks.co" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Stacks Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
