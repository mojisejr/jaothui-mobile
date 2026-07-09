import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";

type SettingsRowProps = {
  disabled?: boolean;
  label: string;
  right?: string;
};

export function SettingsRow({ disabled = true, label, right = "เร็วๆ นี้" }: SettingsRowProps) {
  return (
    <Pressable disabled={disabled} style={[styles.row, disabled && styles.disabled]}>
      <View>
        <Text style={styles.label}>{label}</Text>
        {disabled ? <Text style={styles.caption}>ยังไม่เปิดใช้งานใน public preview</Text> : null}
      </View>
      <Text style={styles.right}>{right}</Text>
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
});
