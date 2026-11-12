import { memo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { BuffaloPhoto, BuffaloPhotoFeedback, BuffaloPhotoStatus } from "@/components/BuffaloPhoto";
import { CopyMicrochip } from "@/components/CopyMicrochip";
import { colors, radius, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";
import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";
import { cardThumbnailUrl } from "@/photos/cardThumbnail";
import { buffaloSex } from "@/utils/buffaloSex";
import { buffaloCardColumns, buffaloCardFooterHeight } from "./buffaloCardLayout";

type BuffaloCardProps = {
  buffalo: MobileBuffaloCard;
  onPress: () => void;
  photo?: { uri: string | null; retry: number };
  /** A one-column FlatList cell owns width; row grids keep percentage flex basis. */
  layout?: "grid" | "list";
};

function BuffaloCardComponent({ buffalo, onPress, photo, layout = "grid" }: BuffaloCardProps) {
  const { width, fontScale, scale } = useWindowDimensions();
  const singleColumn = buffaloCardColumns(width, fontScale) === 1;
  const availableWidth = width - 2 * spacing.screenX;
  const cardWidth = singleColumn ? availableWidth : (availableWidth - spacing.cardGap) / 2;
  const thumbnail = cardThumbnailUrl(photo ? photo.uri : buffalo.imageUrl, cardWidth * scale);
  const sex = buffaloSex(buffalo.sex);
  return (
    <View style={[styles.card, singleColumn && (layout === "list" ? styles.listSingleColumn : styles.singleColumn)]}>
      <BuffaloPhotoFeedback key={buffalo.microchip}>
        <Pressable testID="card-image-navigation" onPress={onPress} accessibilityRole="link" accessibilityLabel={`ดูใบพันธุ์ประวัติ ${buffalo.name || "ไม่ทราบชื่อ"}`}>
          <View style={styles.imageFrame}>
            <BuffaloPhoto uri={photo ? photo.uri : buffalo.imageUrl} identity={buffalo.microchip} thumbnail={thumbnail} retry={photo?.retry} label={buffalo.name || "ไม่ทราบชื่อ"} />
          </View>
        </Pressable>
        <View style={styles.body}>
          <Pressable testID="card-name-navigation" onPress={onPress} style={styles.nameNavigation} accessibilityRole="link" accessibilityLabel={`ดูใบพันธุ์ประวัติ ${buffalo.name || "ไม่ทราบชื่อ"}`}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={2}>
                {buffalo.name || "ไม่ทราบชื่อ"}
              </Text>
              <View style={styles.sex} accessible accessibilityLabel={sex.accessibleLabel}>
                {sex.symbol ? <Text style={styles.sexText} accessible={false}>{sex.symbol}</Text> : null}
                <Text style={styles.sexText} accessible={false}>{sex.label}</Text>
              </View>
            </View>
          </Pressable>
          <CopyMicrochip microchip={buffalo.microchip} identity={buffalo.tokenId ?? buffalo.microchip} />
          <Text style={styles.meta} numberOfLines={1}>
            วันเกิด : {formatThaiBirthdate(buffalo.birthdate)}
          </Text>
          <BuffaloPhotoStatus footerHeight={buffaloCardFooterHeight(fontScale)} leading={<View style={styles.ageBadge}>
            <Text style={styles.ageText}>{formatBuffaloAge(buffalo.ageMonths)}</Text>
          </View>} />
        </View>
      </BuffaloPhotoFeedback>
    </View>
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
  listSingleColumn: { width: "100%", flexBasis: "auto", flexGrow: 0, flexShrink: 0 },
  nameNavigation: { minHeight: spacing.touchTarget, justifyContent: "center" },
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
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
});
