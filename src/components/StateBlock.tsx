import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";

type StateBlockProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateBlock({ title, message, actionLabel, onAction }: StateBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    padding: 18,
    marginTop: 18,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    marginTop: 14,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "800",
  },
});
