import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";

type SettingsRowProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  disabledCaption?: string | null;
  label: string;
  onPress?: () => void;
  right?: string;
  testID?: string;
  variant?: "default" | "danger";
};

export function SettingsRow({
  accessibilityHint,
  accessibilityLabel,
  disabled = true,
  disabledCaption = "ยังไม่เปิดใช้งานใน public preview",
  label,
  onPress,
  right = "เร็วๆ นี้",
  testID,
  variant = "default",
}: SettingsRowProps) {
  const interactive = !!onPress && !disabled;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={interactive ? "button" : "text"}
      accessibilityState={{ disabled: !interactive }}
      disabled={!interactive}
      onPress={onPress}
      style={[
        styles.row,
        disabled && styles.disabled,
        interactive && styles.interactive,
        variant === "danger" && styles.dangerRow,
      ]}
      testID={testID}
    >
      <View>
        <Text style={[styles.label, variant === "danger" && styles.dangerText]}>{label}</Text>
        {disabled && disabledCaption ? <Text style={styles.caption}>{disabledCaption}</Text> : null}
      </View>
      <Text style={[styles.right, variant === "danger" && styles.dangerText]}>{right}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.82,
  },
  interactive: {
    opacity: 1,
  },
  dangerRow: {
    backgroundColor: colors.surfaceRaised,
  },
  label: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  right: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
  },
  dangerText: {
    color: colors.danger,
  },
});
