import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, spacing, typography } from "@/design/tokens";

export function EventButton({ label, onPress, disabled = false, secondary = false, style }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, disabled && styles.disabled, pressed && styles.pressed, style]}>
    <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ button: { minHeight: spacing.touchTarget, borderRadius: spacing.pillRadius, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.gold },
  label: { ...typography.body, fontWeight: "800", color: colors.background, textAlign: "center" }, secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 }, secondaryLabel: { color: colors.gold }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.82 } });
