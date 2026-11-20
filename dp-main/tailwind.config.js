/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // الأنواع الأربعة: DEFAULT للّون الكامل، soft للخلفية الفاتحة، ink للنص الغامق
        hospital: {
          DEFAULT: "rgb(var(--c-hospital) / <alpha-value>)",
          soft: "rgb(var(--c-hospital-soft) / <alpha-value>)",
          ink: "rgb(var(--c-hospital-ink) / <alpha-value>)",
        },
        maxillo: {
          DEFAULT: "rgb(var(--c-maxillo) / <alpha-value>)",
          soft: "rgb(var(--c-maxillo-soft) / <alpha-value>)",
          ink: "rgb(var(--c-maxillo-ink) / <alpha-value>)",
        },
        private: {
          DEFAULT: "rgb(var(--c-private) / <alpha-value>)",
          soft: "rgb(var(--c-private-soft) / <alpha-value>)",
          ink: "rgb(var(--c-private-ink) / <alpha-value>)",
        },
        personal: {
          DEFAULT: "rgb(var(--c-personal) / <alpha-value>)",
          soft: "rgb(var(--c-personal-soft) / <alpha-value>)",
          ink: "rgb(var(--c-personal-ink) / <alpha-value>)",
        },
        w1: {
          DEFAULT: "rgb(var(--c-w1) / <alpha-value>)",
          soft: "rgb(var(--c-w1-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w1-ink) / <alpha-value>)",
        },
        w2: {
          DEFAULT: "rgb(var(--c-w2) / <alpha-value>)",
          soft: "rgb(var(--c-w2-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w2-ink) / <alpha-value>)",
        },
        w3: {
          DEFAULT: "rgb(var(--c-w3) / <alpha-value>)",
          soft: "rgb(var(--c-w3-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w3-ink) / <alpha-value>)",
        },
        w4: {
          DEFAULT: "rgb(var(--c-w4) / <alpha-value>)",
          soft: "rgb(var(--c-w4-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w4-ink) / <alpha-value>)",
        },
        w5: {
          DEFAULT: "rgb(var(--c-w5) / <alpha-value>)",
          soft: "rgb(var(--c-w5-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w5-ink) / <alpha-value>)",
        },
        w6: {
          DEFAULT: "rgb(var(--c-w6) / <alpha-value>)",
          soft: "rgb(var(--c-w6-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w6-ink) / <alpha-value>)",
        },
        w7: {
          DEFAULT: "rgb(var(--c-w7) / <alpha-value>)",
          soft: "rgb(var(--c-w7-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w7-ink) / <alpha-value>)",
        },
        w8: {
          DEFAULT: "rgb(var(--c-w8) / <alpha-value>)",
          soft: "rgb(var(--c-w8-soft) / <alpha-value>)",
          ink: "rgb(var(--c-w8-ink) / <alpha-value>)",
        },
        bg: "#F0EFEA",
        surface: "#FFFFFF",
        line: "#E3E1D8",
        muted: "#64748B",
        ink: "#0F172A",
        danger: "#DC2626",
      },
      fontFamily: {
        cairo: ["Cairo_400Regular"],
        "cairo-semi": ["Cairo_600SemiBold"],
        "cairo-bold": ["Cairo_700Bold"],
      },
    },
  },
  plugins: [],
};
