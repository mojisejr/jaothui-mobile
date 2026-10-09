import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BuffaloPhoto } from "@/components/BuffaloPhoto";
import { colors, shadow, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";
import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";

type BuffaloCardProps = {
  buffalo: MobileBuffaloCard;
  onPress: () => void;
};

function BuffaloCardComponent({ buffalo, onPress }: BuffaloCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageFrame}>
        <BuffaloPhoto uri={buffalo.imageUrl} label={buffalo.name || "ไม่ทราบชื่อ"} />
      </View>
      <View style={styles.body}>
        <View style={styles.ageBadge}>
          <Text style={styles.ageText}>{formatBuffaloAge(buffalo.ageMonths)}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {buffalo.name || "ไม่ทราบชื่อ"}
        </Text>
        <Text style={styles.microchip} numberOfLines={1}>
          {buffalo.microchip}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          วันเกิด : {formatThaiBirthdate(buffalo.birthdate)}
        </Text>
      </View>
    </Pressable>
  );
}

export const BuffaloCard = memo(BuffaloCardComponent);

const styles = StyleSheet.create({
  card: {
    flexBasis: "45%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadow.gold,
  },
  imageFrame: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceRaised,
  },
  ageBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  ageText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    gap: 4,
    padding: 12,
  },
  name: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800",
  },
  microchip: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
});
