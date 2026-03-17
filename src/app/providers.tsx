"use client";

import { AgentProvider } from "@/context/AgentContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AgentProvider>{children}</AgentProvider>;
}
