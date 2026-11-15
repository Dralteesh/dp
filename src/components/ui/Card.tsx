import type { ReactNode } from "react";
import { View } from "react-native";
import { TYPE_META } from "@/constants/shiftTypes";
import type { ShiftType } from "@/types";

type Props = {
  children: ReactNode;
  className?: string;
  /** شريط جانبي ملوّن حسب النوع */
  accent?: ShiftType;
};

export function Card({ children, className = "", accent }: Props) {
  return (
    <View
      className={`bg-surface rounded-2xl border border-line p-4 overflow-hidden ${className}`}
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
