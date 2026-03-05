import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Lend402 — Agent Command Center",
  description:
    "Zero-click JIT micro-lending for AI agents. sBTC collateral → USDCx borrow → merchant payment in a single Stacks Nakamoto fast-block.",
  keywords: ["Stacks", "Bitcoin", "sBTC", "DeFi", "AI agents", "x402", "Nakamoto"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)",  color: "#050810" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Default to dark — ThemeProvider in page.tsx re-applies based on localStorage
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
