import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d8eeff",
          200: "#b9e1ff",
          300: "#89cfff",
          400: "#52b2ff",
          500: "#2a91fe",
          600: "#1372f2",
          700: "#0d5ad8",
          800: "#1149ae",
          900: "#143f89",
          950: "#112754",
        },
        emerald: {
          500: "#10b981",
          600: "#059669",
        },
        amber: {
          500: "#f59e0b",
          600: "#d97706",
        },
        rose: {
          500: "#f43f5e",
          600: "#e11d48",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
