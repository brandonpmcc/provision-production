import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ─── Pro-Vision Painting official brand palette ──────────────────────
        // Source: KickCharge brand guide + provisionpaints.com visual audit
        provision: {
          // Primary action color — red-orange (matches website CTAs & headline text)
          orange: "#D14124",          // PMS 7597 CP  #D14124
          "orange-dark": "#b53519",   // hover/active state
          "orange-light": "#fde8e2",  // tinted background
          "orange-muted": "#f5d0c8",

          // Teal accent — used heavily on the website (form headers, dividers, highlights)
          teal: "#05C3DE",            // PMS 311 CP   #05C3DE
          "teal-dark": "#04a8c0",
          "teal-light": "#e0f7fb",
          "teal-muted": "#88DBDF",    // PMS 318 CP

          // Dark backgrounds — sidebar, nav, overlays
          navy: "#101820",            // PMS BLACK 6 CP — deepest dark
          charcoal: "#131E29",        // PMS 7547 CP  — sidebar bg
          "charcoal-mid": "#1b2c3d",  // sidebar hover
          "charcoal-dark": "#101820", // legacy alias

          // Light UI
          gray: "#F4F6F8",            // page background
          "gray-mid": "#E5E7EB",      // borders, dividers
          "gray-border": "#D1D5DB",
          "gray-text": "#6B7280",     // secondary text
          "gray-muted": "#9CA3AF",    // placeholder text
        },
      },
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // Bold condensed for page headers — matches website's big impactful headings
        display: ["Barlow Condensed", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:        "0 1px 3px 0 rgba(16, 24, 32, 0.07), 0 1px 2px -1px rgba(16, 24, 32, 0.05)",
        "card-hover":"0 4px 16px 0 rgba(16, 24, 32, 0.11)",
        "card-teal": "0 0 0 2px #05C3DE",
        "card-orange":"0 0 0 2px #D14124",
      },
    },
  },
  plugins: [],
};

export default config;
