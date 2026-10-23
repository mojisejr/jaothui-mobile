import { memo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BuffaloPhoto, BuffaloPhotoFeedback, BuffaloPhotoStatus } from "@/components/BuffaloPhoto";
import { colors, radius, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";
import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";
import { buffaloSex } from "@/utils/buffaloSex";
import { buffaloCardColumns, buffaloCardFooterHeight } from "./buffaloCardLayout";

type BuffaloCardProps = {
  buffalo: MobileBuffaloCard;
  onPress: () => void;
  photo?: { uri: string | null; retry: number };
};

function BuffaloCardComponent({ buffalo, onPress, photo }: BuffaloCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const sex = buffaloSex(buffalo.sex);
  return (
    <Pressable style={[styles.card, buffaloCardColumns(width, fontScale) === 1 && styles.singleColumn]} onPress={onPress}>
      <BuffaloPhotoFeedback key={buffalo.microchip}>
        <View style={styles.imageFrame}>
          <BuffaloPhoto uri={photo ? photo.uri : buffalo.imageUrl} identity={buffalo.microchip} retry={photo?.retry} label={buffalo.name || "ไม่ทราบชื่อ"} />
        </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={2}>
          {buffalo.name || "ไม่ทราบชื่อ"}
        </Text>
        <View style={styles.sex} accessible accessibilityLabel={sex.accessibleLabel}>
          {sex.symbol ? <Text style={styles.sexText} accessible={false}>{sex.symbol}</Text> : null}
          <Text style={styles.sexText} accessible={false}>{sex.label}</Text>
        </View>
        </View>
        <Text style={styles.microchip} numberOfLines={1}>
          {buffalo.microchip}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          วันเกิด : {formatThaiBirthdate(buffalo.birthdate)}
        </Text>
        <BuffaloPhotoStatus footerHeight={buffaloCardFooterHeight(fontScale)} leading={<View style={styles.ageBadge}>
          <Text style={styles.ageText}>{formatBuffaloAge(buffalo.ageMonths)}</Text>
        </View>} />
      </View>
      </BuffaloPhotoFeedback>
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
    borderColor: colors.photoHairline,
    borderRadius: radius.photo,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  imageFrame: {
    aspectRatio: 3 / 2,
    backgroundColor: colors.surface,
  },
  singleColumn: { flexBasis: "100%" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, minWidth: 0 },
  sex: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, flexShrink: 0 },
  sexText: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  ageBadge: {
    alignSelf: "flex-start",
  },
  ageText: {
    color: colors.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  body: {
    gap: 4,
    padding: 12,
  },
  name: {
    minWidth: 0,
    flex: 1,
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 22,
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
