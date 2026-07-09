import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "@/design/tokens";

type StatCardProps = {
  value: string;
  unit?: string;
  label: string;
};

export function StatCard({ value, unit, label }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 92,
    padding: spacing.md,
    ...shadow.raised,
  },
  value: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  unit: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
