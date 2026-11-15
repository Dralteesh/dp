/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // الأنواع الأربعة: DEFAULT للّون الكامل، soft للخلفية الفاتحة، ink للنص الغامق
        hospital: { DEFAULT: "#2563EB", soft: "#DBEAFE", ink: "#1E3A8A" },
        maxillo: { DEFAULT: "#EAB308", soft: "#FEF3C7", ink: "#713F12" },
        private: { DEFAULT: "#16A34A", soft: "#DCFCE7", ink: "#14532D" },
        personal: { DEFAULT: "#7C3AED", soft: "#EDE9FE", ink: "#4C1D95" },
        bg: "#F5F7FB",
        surface: "#FFFFFF",
        line: "#E5E9F2",
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
