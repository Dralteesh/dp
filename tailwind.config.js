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
