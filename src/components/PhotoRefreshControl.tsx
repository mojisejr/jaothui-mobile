import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";

/** Also accessible to keyboard/switch users who cannot perform a pull gesture. */
export function PhotoRefreshControl({ refreshing, status, onRefresh }: {
  refreshing: boolean; status: "idle" | "success" | "unavailable"; onRefresh: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="รีเฟรชภาพ" accessibilityState={{ busy: refreshing }}
        disabled={refreshing} onPress={onRefresh} style={styles.button}>
        <Text style={styles.text}>{refreshing ? "กำลังตรวจสอบภาพ…" : "รีเฟรชภาพ"}</Text>
      </Pressable>
      {status === "unavailable" ? <Text style={styles.note}>ตรวจสอบภาพล่าสุดไม่ได้ ลองใหม่ได้ภายหลัง</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { alignItems: "flex-end", marginVertical: spacing.xxs },
  button: { minHeight: spacing.touchTarget, paddingHorizontal: spacing.sm, justifyContent: "center" },
  text: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  note: { color: colors.muted, fontSize: 12 },
});
