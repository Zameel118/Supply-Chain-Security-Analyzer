/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#020408",
          900: "#050A14",
          800: "#0A1220",
          700: "#0F1A2E",
          600: "#152238",
        },
        manifest: {
          100: "#E2E8F0",
          200: "#7C8BA3",
        },
        signal: {
          /* Primary — electric blue (class names kept) */
          teal: "#2563EB",
          tealDim: "#1D4ED8",
          /* Live HUD / scan line */
          cyan: "#22D3EE",
          /* Terminal pass / matrix */
          lime: "#4ADE80",
        },
        stamp: {
          amber: "#FBBF24",
          red: "#F87171",
          slate: "#5C6B82",
          green: "#4ADE80",
        },
      },
      fontFamily: {
        display: ["var(--font-plex-condensed)", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        "live-glow": "0 0 48px -12px rgba(37, 99, 235, 0.55)",
        "cyber-glow": "0 0 32px -8px rgba(34, 211, 238, 0.45)",
        "live-inner": "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
    },
  },
  plugins: [],
};
