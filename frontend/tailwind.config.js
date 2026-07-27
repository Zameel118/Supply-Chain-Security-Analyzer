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
          950: "#0A0E14",
          800: "#121A24",
          700: "#1A2433",
        },
        manifest: {
          100: "#E8ECF4",
          200: "#94A3B8",
        },
        signal: {
          /* Primary brand — industrial amber (class names kept for compatibility) */
          teal: "#F59E0B",
          tealDim: "#D97706",
          /* Live telemetry / HUD steel blue */
          cyan: "#38BDF8",
          /* Cleared berth / pass */
          lime: "#34D399",
        },
        stamp: {
          amber: "#FBBF24",
          red: "#F87171",
          slate: "#64748B",
          green: "#34D399",
        },
      },
      fontFamily: {
        display: ["var(--font-plex-condensed)", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        "live-glow": "0 0 48px -12px rgba(245, 158, 11, 0.45)",
        "live-inner": "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
    },
  },
  plugins: [],
};
