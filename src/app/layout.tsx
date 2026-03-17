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
      "0b29b965f8fcc170b51523209386b91370321f28620b4e01d498b936f88aa80f3d13f980a41d55ef874cc26a6d480f4d9c4ad5823c1f86fc400f098d01ccff41",
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
