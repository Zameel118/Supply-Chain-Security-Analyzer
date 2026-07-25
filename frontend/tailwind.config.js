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
          950: "#0B1420",
          800: "#13233A",
          700: "#1B2E48",
        },
        manifest: {
          100: "#E8E2D0",
          200: "#DCD4BC",
        },
        signal: {
          teal: "#2DD4BF",
          tealDim: "#14B8A6",
        },
        stamp: {
          amber: "#F0A93F",
          red: "#E14B4B",
          slate: "#7C8CA6",
        },
      },
      fontFamily: {
        display: ["var(--font-plex-condensed)", "sans-serif"],
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
