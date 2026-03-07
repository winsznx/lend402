import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lend402 — Stacks-Native x402 Credit Rail for Agentic APIs",
  description:
    "Lend402 turns paid agent calls into Stacks-native x402 transactions. Agents use sBTC collateral to borrow just enough USDCx to settle a request on-chain before the provider response is released.",
  keywords: ["Stacks", "Bitcoin", "sBTC", "USDCx", "AI agents", "x402", "Nakamoto", "Clarity"],
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
  other: {
    "talentapp:project_verification":
      "31b678dcae1e731a93b37f2f09fbe57e89f05853459e05dd0a46e88af64b1208f69fd791ee06c14fd48e6b2190e4797d28326a2020d3d8ce788394fdd5c1cfbb",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#050810" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
