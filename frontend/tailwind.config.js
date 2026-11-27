/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "var(--border, #e2e8f0)",
        input: "var(--input, #e2e8f0)",
        ring: "var(--ring, #0066CC)",
        background: "var(--background, #ffffff)",
        foreground: "var(--foreground, #0f172a)",
        primary: {
          DEFAULT: "var(--primary, #0066CC)",
          foreground: "var(--primary-foreground, #ffffff)",
        },
        secondary: {
          DEFAULT: "var(--secondary, #f1f5f9)",
          foreground: "var(--secondary-foreground, #0f172a)",
        },
        destructive: {
          DEFAULT: "var(--destructive, #ef4444)",
          foreground: "var(--destructive-foreground, #ffffff)",
        },
        muted: {
          DEFAULT: "var(--muted, #f8fafc)",
          foreground: "var(--muted-foreground, #64748b)",
        },
        accent: {
          DEFAULT: "var(--accent, #f1f5f9)",
          foreground: "var(--accent-foreground, #0f172a)",
        },
        popover: {
          DEFAULT: "var(--popover, #ffffff)",
          foreground: "var(--popover-foreground, #0f172a)",
        },
        card: {
          DEFAULT: "var(--card, #ffffff)",
          foreground: "var(--card-foreground, #0f172a)",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.625rem)",
        md: "calc(var(--radius, 0.625rem) - 2px)",
        sm: "calc(var(--radius, 0.625rem) - 4px)",
      },
    },
  },
  plugins: [],
}
