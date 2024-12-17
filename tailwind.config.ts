import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      serif: ["Urbit Sans", "serif"],
      sans: ["Urbit Sans", "sans-serif"],
      mono: ["Urbit Sans Mono", "mono"],
    },
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontSize: {
        "3xs": ["0.25rem", {lineHeight: "0.5rem"}],
        "2xs": ["0.50rem", {lineHeight: "0.75rem"}],
      },
    },
  },
  plugins: [],
} satisfies Config;
