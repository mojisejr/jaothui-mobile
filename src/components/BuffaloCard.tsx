import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
        {buffalo.imageUrl ? (
          <Image source={{ uri: buffalo.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>JAOTHUI</Text>
          </View>
        )}
        <View style={styles.ageBadge}>
          <Text style={styles.ageText}>{formatBuffaloAge(buffalo.ageMonths)}</Text>
        </View>
      </View>
      <View style={styles.body}>
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
    flex: 1,
    minWidth: 150,
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
  image: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  imageFallbackText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ageBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: colors.overlay,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    borderRadius: spacing.pillRadius,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
