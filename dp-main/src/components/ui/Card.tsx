import type { ReactNode } from "react";
import { View } from "react-native";
import { SOFT_SHADOW } from "@/constants/skin";
import { TYPE_META } from "@/constants/shiftTypes";
import type { ShiftType } from "@/types";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  children: ReactNode;
  className?: string;
  /** شريط جانبي ملوّن حسب النوع */
  accent?: ShiftType;
};

export function Card({ children, className = "", accent }: Props) {
  useTheme();
  return (
    <View
      className={`bg-surface rounded-3xl border border-line p-4 overflow-hidden ${className}`}
      style={SOFT_SHADOW}
    >
      {accent ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            start: 0,
            width: 5,
            backgroundColor: TYPE_META[accent].hex,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
