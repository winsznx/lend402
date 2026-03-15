import Link from "next/link";
import React from "react";

function StaticTerminal() {
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-slate-700 w-full"
      style={{
        background: "linear-gradient(160deg, #090e1a 0%, #050810 100%)",
      }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800 bg-[#0a0f1a]/80 backdrop-blur-md">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex-1 text-center">
          <span className="font-mono text-[10px] tracking-widest text-slate-500">
            lend402-client — bash
          </span>
        </div>
      </div>
      
      {/* Code window */}
      <div className="p-4 sm:p-6 font-mono text-[12px] sm:text-[13px] flex flex-col gap-3 sm:gap-4 leading-relaxed overflow-x-auto whitespace-nowrap">
        <div className="flex gap-3">
          <span className="text-slate-600 shrink-0 select-none">12:04:11</span>
          <span className="text-orange-400">!! [402 Payment Required] intercepted from api.anthropic.com/v1/messages</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-600 shrink-0 select-none">12:04:12</span>
          <span className="text-cyan-400">◆◆ Executing borrow-and-pay tx... (0x4f9c21b2a...7e8d)</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-600 shrink-0 select-none">12:04:17</span>
          <span className="text-emerald-400">██ Payment confirmed. Response streaming.</span>
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-slate-400 flex items-center">agent@lend402:~$ <span className="inline-block w-2.5 h-[1.1rem] ml-2 bg-cyan-400 align-middle opacity-80 animate-pulse" /></span>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. Hero Section */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center pt-12 pb-24 overflow-hidden">
        {/* Abstract background glows */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            {/* Left Column: Typography (60%) */}
            <div className="w-full lg:w-[60%] flex flex-col gap-8 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                The payment and credit rail for agentic APIs on Stacks.
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Any HTTPS API becomes a pay-per-call endpoint. Agents pay from sBTC collateral without holding stablecoins. Every settlement is an on-chain txid.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mt-4">
                <Link
                  href="/vault/new"
                  className="w-full sm:w-auto px-8 py-4 rounded-lg bg-cyan-600 text-white font-medium text-lg hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)]"
                >
                  Register an API vault
                </Link>
                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto px-8 py-4 rounded-lg border border-slate-700 text-slate-300 font-medium text-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                >
                  See how it works
                </a>
              </div>
            </div>
            
            {/* Right Column: Terminal (40%) */}
            <div className="w-full lg:w-[40%] flex justify-center lg:justify-end">
              <div className="w-full max-w-lg lg:max-w-none">
                <StaticTerminal />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three-Persona Explainer */}
      <section className="py-24 bg-[#090e1a]/50 border-y border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* API Provider Card */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-2 shrink-0">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-100 leading-snug">Monetize any endpoint</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Point Lend402 at your origin URL. Set a price per call. Share the wrapped gateway URL. You receive USDCx directly — no invoices, no billing infrastructure, no API keys to manage.
              </p>
            </div>

            {/* AI Agent Operator Card */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20 mb-2 shrink-0">
                <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-100 leading-snug">Pay from sBTC, never pre-load stablecoins</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Your agent holds sBTC as its treasury asset. When it hits a 402, Lend402 borrows the exact USDCx needed, settles on Stacks, and repays — all in one atomic transaction. Zero idle stablecoin exposure.
              </p>
            </div>

            {/* Enterprise Card */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-2 shrink-0">
                <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-100 leading-snug">Every payment is auditable</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Each call produces a Stacks transaction ID verifiable on the public Hiro explorer. No vendor billing records required — the blockchain is the receipt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Six-Step Flow */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4 tracking-tight">How It Works</h2>
            <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto">The completely frictionless agent-to-service payment loop.</p>
          </div>
          
          <div className="relative">
            {/* Desktop Horizontal Line */}
            <div className="hidden lg:block absolute top-[28px] left-[calc(100%/12)] right-[calc(100%/12)] h-0.5 bg-slate-800" />
            
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-0 justify-between relative z-10">
              {[
                { step: "1", label: "REQUEST", desc: "Agent attempts a standard HTTPS request to an API endpoint." },
                { step: "2", label: "402", desc: "The gateway intercepts the request and responds with a 402 Payment Required status." },
                { step: "3", label: "LOCK sBTC", desc: "The smart contract locks a fraction of the agent's sBTC stack." },
                { step: "4", label: "BORROW", desc: "The protocol dynamically issues the exact USDCx required." },
                { step: "5", label: "PAY", desc: "USDCx is routed directly to the API provider in the same transaction." },
                { step: "6", label: "CONFIRM", desc: "The gateway verifies the payment and securely proxies the response." },
              ].map((item, i) => (
                <div key={item.step} className="flex flex-row lg:flex-col items-start lg:items-center text-left lg:text-center flex-1 relative group">
                  {/* Mobile Vertical Line */}
                  {i !== 5 && <div className="lg:hidden absolute top-14 bottom-[-1rem] left-7 w-0.5 bg-slate-800" />}
                  
                  <div className="shrink-0 w-14 h-14 rounded-full bg-[#050810] border-2 border-slate-700 flex items-center justify-center font-mono font-bold text-lg text-slate-300 group-hover:border-cyan-500 group-hover:text-cyan-400 transition-colors z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)] lg:mb-8">
                    {item.step}
                  </div>
                  <div className="ml-6 lg:ml-0 flex flex-col pt-3 lg:pt-0 pb-6 lg:pb-0 px-0 lg:px-2">
                    <h4 className="font-mono text-cyan-400 font-bold tracking-widest mb-2 lg:mb-3 uppercase text-sm">{item.label}</h4>
                    <p className="text-[15px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Technical Differentiation Section */}
      <section className="py-24 bg-[#090e1a]/50 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-left">
            <div className="flex flex-col gap-4">
              <h4 className="text-xl font-bold text-slate-200">PostConditionMode.DENY</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                sBTC collateral movement is enforced at the Stacks consensus layer, not the smart contract layer. The transaction reverts entirely if any amount differs from what was declared.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-xl font-bold text-slate-200">x402 V2 compliant</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                Implements the canonical payment-signature, payment-required, and payment-response headers with a payment-identifier tamper detection extension.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-xl font-bold text-slate-200">Atomic borrow-and-pay</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                A single Clarity contract call checks collateral ratio, locks sBTC, borrows USDCx, routes it to the provider, and records the debt. Everything or nothing.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
