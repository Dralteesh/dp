import { Text as RNText, type TextProps } from "react-native";

type Weight = "regular" | "semi" | "bold";

const FAMILY: Record<Weight, string> = {
  regular: "font-cairo",
  semi: "font-cairo-semi",
  bold: "font-cairo-bold",
};

type Props = TextProps & { w?: Weight; className?: string };

/** نص التطبيق: خط Cairo ولون افتراضي. استخدمه بدل Text من react-native */
export function Text({ w = "regular", className = "", ...rest }: Props) {
  return <RNText {...rest} className={`${FAMILY[w]} text-ink ${className}`} />;
}
