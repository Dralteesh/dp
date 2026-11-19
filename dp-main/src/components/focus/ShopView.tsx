import { Alert, View } from "react-native";
import { Tree } from "@/components/focus/Tree";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { SPECIES, useFocus, type Species } from "@/store/useFocus";

const GREEN = "#15803D";

export function ShopView() {
  const coins = useFocus((s) => s.coins);
  const unlocked = useFocus((s) => s.unlocked);

  const buy = (sp: Species) => {
    const cost = SPECIES[sp].cost;
    if (coins < cost) return Alert.alert("عملات غير كافية", `تحتاج ${cost} عملة لفتح «${SPECIES[sp].label}». عندك ${coins}.`);
    Alert.alert("فتح نوع جديد", `فتح «${SPECIES[sp].label}» مقابل ${cost} عملة؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "فتح", onPress: () => useFocus.getState().unlock(sp) },
    ]);
  };

  return (
    <View className="mt-4">
      <View className="rounded-3xl p-4 flex-row items-center justify-between" style={{ backgroundColor: "#FEF3C7" }}>
        <View>
          <Text className="text-xs" style={{ color: "#92400E" }}>
            رصيدك
          </Text>
          <Text w="bold" style={{ fontSize: 30, lineHeight: 40, color: "#92400E" }}>
            {coins} عملة
          </Text>
        </View>
        <Text className="text-xs leading-5 flex-1 text-left" style={{ color: "#92400E" }}>
          كل دقيقة تركيز ناجحة = عملة واحدة.
        </Text>
      </View>

      {(Object.keys(SPECIES) as Species[]).map((sp) => {
        const owned = unlocked.includes(sp);
        return (
          <View key={sp} className="flex-row items-center gap-3 rounded-2xl p-3 mt-3" style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E0D8" }}>
            <View style={{ opacity: owned ? 1 : 0.55 }}>
              <Tree species={sp} progress={1} size={92} seed="shop" />
            </View>
            <View className="flex-1">
              <Text w="bold" className="text-base">
                {SPECIES[sp].label}
              </Text>
              <Text className="text-xs text-muted leading-5">{SPECIES[sp].desc}</Text>
              <View className="mt-2 self-start">
                {owned ? (
                  <Text w="semi" className="text-sm" style={{ color: GREEN }}>
                    ✓ مفتوحة
                  </Text>
                ) : (
                  <Button label={`افتح • ${SPECIES[sp].cost}`} icon="lock-open-outline" small variant={coins >= SPECIES[sp].cost ? "solid" : "soft"} onPress={() => buy(sp)} />
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
