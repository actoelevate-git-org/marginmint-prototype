import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

/**
 * MarginMint design tokens. Brand colours come from the product spec; chart
 * series colours were validated for colour-vision deficiency separation against
 * the white card surface (see `src/components/charts/chart-theme.ts`).
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#14532D", 600: "#166534", 900: "#0F3D22", 950: "#0B2E1A" },
        emerald: { DEFAULT: "#16A34A" },
        mint: "#DCFCE7",
        ink: "#111827",
        muted: "#6B7280",
        canvas: "#F8FAFC",
        line: "#E5E7EB",
        warning: { DEFAULT: "#F59E0B", text: "#B45309", soft: "#FFFBEB" },
        loss: { DEFAULT: "#DC2626", text: "#B91C1C", soft: "#FEF2F2" },
        gain: { text: "#15803D", soft: "#F0FDF4" },
        chart: {
          sales: "#2A78D6",
          gross: "#EB6834",
          net: "#16A34A",
          deduction: "#94A3B8",
          grid: "#EEF0F3",
          axis: "#6B7280",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 24, 39, 0.04)",
        popover: "0 8px 24px -6px rgba(17, 24, 39, 0.14), 0 2px 6px rgba(17, 24, 39, 0.06)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
