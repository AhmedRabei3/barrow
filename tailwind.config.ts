import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/components/**/*.{ts,tsx,js,jsx,mdx}",
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0891b2", dark: "#0e7490", light: "#22d3ee" },
        secondary: { DEFAULT: "#f59e0b", dark: "#d97706", light: "#fbbf24" },
        background: "#f8fafc",
        text: { DEFAULT: "#1e293b", muted: "#475569" },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        ar: ["var(--font-noto-kufi)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
