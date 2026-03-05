import type { Config } from "tailwindcss";

const config: Config = {
  // "class" strategy: dark mode toggled by adding .dark to <html>
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      animation: {
        "terminal-in": "terminalIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        terminalIn: {
          "0%":   { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
