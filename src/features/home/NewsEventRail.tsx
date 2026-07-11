import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@/components/Skeleton";
import { colors, radius, shadow, spacing, typography } from "@/design/tokens";
import type { AsyncState } from "@/hooks/useAsyncResource";
import type { MobileNewsEvents, MobileNewsEventCard } from "@/types/mobile-api";

type NewsEventRailProps = {
  state: AsyncState<MobileNewsEvents>;
  onRetry: () => void;
};

const logoSource = require("@/assets/images/thuiLogo.png");

export function NewsEventRail({ state, onRetry }: NewsEventRailProps) {
  if (state.status === "loading") {
    return (
      <View style={styles.section}>
        <SectionHeader />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {Array.from({ length: 2 }).map((_, index) => (
            <View key={index} style={styles.skeletonCard}>
              <Skeleton variant="image" style={styles.skeletonImage} />
              <View style={styles.skeletonBody}>
                <Skeleton style={styles.skeletonMeta} />
                <Skeleton style={styles.skeletonTitle} />
                <Skeleton style={styles.skeletonCopy} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.section}>
        <SectionHeader />
        <View style={styles.compactState}>
          <View>
            <Text style={styles.stateTitle}>โหลดข่าวสารไม่สำเร็จ</Text>
            <Text style={styles.stateText}>เนื้อหาหลักยังใช้งานได้ตามปกติ</Text>
          </View>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>ลองใหม่</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (state.data.items.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader />
        <View style={styles.emptyState}>
          <Image source={logoSource} style={styles.emptyLogo} resizeMode="contain" />
          <View style={styles.emptyTextBlock}>
            <Text style={styles.stateTitle}>ข่าวสารและกิจกรรมกำลังจะมา</Text>
            <Text style={styles.stateText}>ติดตามประกาศจาก JAOTHUI ได้เร็วๆ นี้</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        decelerationRate="fast"
      >
        {state.data.items.map((item) => (
          <NewsEventCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>ข่าวสารและกิจกรรม</Text>
      <Text style={styles.sectionKicker}>JAOTHUI UPDATE</Text>
    </View>
  );
}

function NewsEventCard({ item }: { item: MobileNewsEventCard }) {
  const openCta = () => {
    if (item.ctaUrl) {
      void Linking.openURL(item.ctaUrl);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      onPress={openCta}
      disabled={!item.ctaUrl}
    >
      <View style={styles.imageFrame}>
        {item.coverImageUrl ? (
          <Image source={{ uri: item.coverImageUrl }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Image source={logoSource} style={styles.fallbackLogo} resizeMode="contain" />
          </View>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.typeLabel}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.dateText} numberOfLines={1}>
          {item.displayDate}
          {item.location ? ` · ${item.location}` : ""}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={3}>
          {item.excerpt}
        </Text>
        <Text style={item.ctaUrl ? styles.ctaText : styles.ctaMuted} numberOfLines={1}>
          {item.ctaUrl ? item.ctaLabel : "รายละเอียดเร็วๆ นี้"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  header: {
    alignItems: "flex-start",
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.foreground,
    ...typography.sectionTitle,
  },
  sectionKicker: {
    color: colors.gold,
    ...typography.caption,
    letterSpacing: 0.8,
  },
  listContent: {
    gap: spacing.sm,
    paddingRight: spacing.screenX,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 340,
    overflow: "hidden",
    width: 278,
    ...shadow.raised,
  },
  cardPressed: {
    opacity: 0.82,
  },
  imageFrame: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceRaised,
  },
  coverImage: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
  },
  fallbackLogo: {
    height: 56,
    opacity: 0.78,
    width: 56,
  },
  typeBadge: {
    backgroundColor: colors.overlayBadge,
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    position: "absolute",
    top: spacing.sm,
  },
  typeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
  },
  cardBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  dateText: {
    color: colors.gold,
    ...typography.caption,
  },
  cardTitle: {
    color: colors.foreground,
    ...typography.cardTitle,
  },
  excerpt: {
    color: colors.muted,
    ...typography.body,
  },
  ctaText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.xs,
    minHeight: spacing.touchTarget,
    textAlignVertical: "center",
  },
  ctaMuted: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.xs,
    minHeight: spacing.touchTarget,
    textAlignVertical: "center",
  },
  compactState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  emptyLogo: {
    height: 38,
    width: 38,
  },
  emptyTextBlock: {
    flex: 1,
  },
  stateTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
  },
  stateText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xxs,
  },
  retryButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  retryText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
    width: 278,
  },
  skeletonImage: {
    aspectRatio: 16 / 9,
    borderRadius: 0,
    width: "100%",
  },
  skeletonBody: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  skeletonMeta: {
    height: 14,
    width: "42%",
  },
  skeletonTitle: {
    height: 20,
    width: "86%",
  },
  skeletonCopy: {
    height: 44,
    width: "100%",
  },
});
