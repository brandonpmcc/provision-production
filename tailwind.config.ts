import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ProVision Painting brand palette
        provision: {
          orange: "#F57C1F",
          "orange-dark": "#D86810",
          "orange-light": "#FFE9D5",
          charcoal: "#1F2937",
          "charcoal-dark": "#0F172A",
          gray: "#F3F4F6",
          "gray-mid": "#E5E7EB",
          "gray-text": "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        "card-hover": "0 4px 12px 0 rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
