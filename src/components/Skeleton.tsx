import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "@/design/tokens";

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
  variant?: "text" | "pill" | "image" | "card";
};

export function Skeleton({ style, variant = "text" }: SkeletonProps) {
  return <View style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.skeletonBase,
    overflow: "hidden",
  },
  text: {
    borderRadius: radius.sm,
    height: 14,
  },
  pill: {
    borderRadius: radius.pill,
    height: 36,
  },
  image: {
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
  },
  card: {
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 180,
  },
});
