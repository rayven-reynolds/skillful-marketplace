import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        sage: {
          dark:   "#3D5C4A",
          mid:    "#5C7A65",
          light:  "#8AAF95",
          pale:   "#B8D4BF",
          tint:   "#EDF4EF",
          bg:     "#F5F8F5",
          border: "#C8D8CB",
        },
        "dark-text":  "#1A261D",
        "mid-text":   "#4A6550",
        "muted-text": "#7A9F80",
      },
      fontFamily: {
        sans:    ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
