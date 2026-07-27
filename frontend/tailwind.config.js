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
          950: "#06060A",
          800: "#101018",
          700: "#1A1A26",
        },
        manifest: {
          100: "#F4F4F8",
          200: "#B4B4C8",
        },
        signal: {
          /* Primary accent — hot magenta (class name kept for compatibility) */
          teal: "#FF3D81",
          tealDim: "#E11D48",
          cyan: "#22D3EE",
        },
        stamp: {
          /* Warning tier — violet (no yellow) */
          amber: "#A78BFA",
          red: "#F43F5E",
          slate: "#9494B8",
        },
      },
      fontFamily: {
        display: ["var(--font-plex-condensed)", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      boxShadow: {
        "live-glow": "0 0 48px -12px rgba(255, 61, 129, 0.45)",
        "live-inner": "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
    },
  },
  plugins: [],
};
