import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#e0e5ec",
        ink: "#1f2a44",
        sub: "#5d6b8c",
        faint: "#8b97b5",
        accent: {
          DEFAULT: "#2f6bff",
          dark: "#1f4fd1",
          soft: "#d8e4ff",
        },
        ok: "#2f9e77",
        warn: "#c9862b",
        bad: "#d05555",
        viol: "#7a5af8",
      },
      boxShadow: {
        neu: "9px 9px 18px #c6ccd8, -9px -9px 18px #ffffff",
        "neu-sm": "5px 5px 10px #c6ccd8, -5px -5px 10px #ffffff",
        "neu-xs": "3px 3px 6px #c6ccd8, -3px -3px 6px #ffffff",
        "neu-in": "inset 4px 4px 9px #c6ccd8, inset -4px -4px 9px #ffffff",
        "neu-in-sm": "inset 2px 2px 5px #c6ccd8, inset -2px -2px 5px #ffffff",
        "neu-pop": "16px 16px 32px #c0c7d4, -16px -16px 32px #ffffff",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
