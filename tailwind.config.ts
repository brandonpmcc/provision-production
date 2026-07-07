import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ProVision Painting — official brand palette (KickCharge brand guide)
        provision: {
          orange: "#fc7115",          // Official brand orange (from PVP LOGO.svg)
          "orange-dark": "#e05e00",
          "orange-light": "#fff3e8",
          "orange-muted": "#fde8d5",
          navy: "#101820",            // Deepest dark (PMS BLACK 6 CP)
          charcoal: "#131E29",        // Primary dark sidebar (PMS 7547 CP)
          "charcoal-mid": "#1e2d3d",  // Sidebar hover
          "charcoal-dark": "#101820", // Legacy alias = navy
          teal: "#05C3DE",            // Accent teal (PMS 311 CP)
          "teal-light": "#88DBDF",
          gray: "#F4F6F8",            // Page background
          "gray-mid": "#E5E7EB",
          "gray-border": "#D1D5DB",
          "gray-text": "#6B7280",
          "gray-muted": "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(16, 24, 32, 0.06), 0 1px 2px -1px rgba(16, 24, 32, 0.04)",
        "card-hover": "0 4px 16px 0 rgba(16, 24, 32, 0.10)",
        glow: "0 0 0 3px rgba(252, 113, 21, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
