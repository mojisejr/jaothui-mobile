import { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { EventSummary } from "@/types/events";
import { eventDayLabel } from "./model";
const logo = require("@/assets/images/thuiLogo.png");

export const EventPreviewCard = memo(function EventPreviewCard({ event, onPress, width, compact = false }: { event: EventSummary; onPress: () => void; width?: number; compact?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${event.name} แข่งขัน ${eventDayLabel(event.competitionStartDay)} ดูรายละเอียด`} style={({ pressed }) => [styles.card, width !== undefined && { width }, compact && styles.row, pressed && styles.pressed]}>
    <View style={[styles.image, compact && styles.rowImage]}>
      {event.imageUrl ? <Image source={{ uri: event.imageUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors /> : <Image source={logo} resizeMode="contain" style={styles.logo} />}
      {!compact && event.imageUrl ? <>
        <View pointerEvents="none" style={[styles.blurBand, styles.topBand]}><Image source={{ uri: event.imageUrl }} blurRadius={12} resizeMode="cover" style={styles.blurredImage} /><View style={styles.scrim} /></View>
        <View pointerEvents="none" style={[styles.blurBand, styles.bottomBand]}><Image source={{ uri: event.imageUrl }} blurRadius={12} resizeMode="cover" style={styles.blurredImage} /><View style={styles.scrim} /></View>
      </> : null}
      {!compact ? <View style={styles.tag}><Text style={styles.tagText}>เปิดรับสมัคร · {event.eventType === "royal" ? "ROYAL" : "ประกวดกระบือ"}</Text></View> : null}
    </View>
    <View style={styles.body}>
      <Text style={styles.date}>{eventDayLabel(event.competitionStartDay)}</Text>
      <Text style={styles.title} numberOfLines={compact ? 3 : 2}>{event.name}</Text>
      {event.location ? <Text style={styles.location} numberOfLines={1}>{event.location}</Text> : null}
      <Text style={styles.cta}>ดูรายละเอียดและสมัคร →</Text>
    </View>
  </Pressable>;
});
const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderWidth: 1, borderRadius: radius.card, overflow: "hidden" }, pressed: { opacity: 0.82 },
  image: { aspectRatio: 16 / 9, backgroundColor: colors.surfaceRaised, justifyContent: "center", alignItems: "center", overflow: "hidden" }, logo: { width: 64, height: 64, opacity: 0.7 },
  body: { padding: spacing.md, gap: spacing.xs, flex: 1 }, title: { ...typography.cardTitle, color: colors.foreground }, date: { ...typography.label, color: colors.gold }, location: { ...typography.label, color: colors.muted }, cta: { ...typography.body, fontWeight: "700", color: colors.gold, paddingTop: spacing.xxs },
  row: { flexDirection: "row" }, rowImage: { width: 96, aspectRatio: undefined, alignSelf: "stretch" },
  blurBand: { position: "absolute", left: 0, right: 0, overflow: "hidden" }, topBand: { top: 0, height: spacing.xxxl }, bottomBand: { bottom: 0, height: spacing.xxxl }, blurredImage: { width: "100%", height: "100%" }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  tag: { position: "absolute", top: spacing.xs, left: spacing.sm, right: spacing.sm }, tagText: { ...typography.label, color: colors.foreground, fontWeight: "700" } });
