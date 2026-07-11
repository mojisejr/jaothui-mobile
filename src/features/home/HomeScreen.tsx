import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { getHome, getNewsEvents } from "@/api/jaothui";
import { BuffaloCard } from "@/components/BuffaloCard";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { StatCard } from "@/components/StatCard";
import { colors, radius, shadow, spacing, typography } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { NewsEventRail } from "./NewsEventRail";

const heroImage = require("@/assets/images/jaothui-v2-hero-image.png");
const logoSource = require("@/assets/images/thuiLogo.png");

export function HomeScreen() {
  const router = useRouter();
  const loadHome = useCallback(() => getHome(), []);
  const loadNewsEvents = useCallback(() => getNewsEvents(), []);
  const state = useAsyncResource(loadHome);
  const newsEventsState = useAsyncResource(loadNewsEvents);
  const heroSubtitle =
    state.status === "success" && state.data.hero.subtitle !== "Thai Buffalo Platform"
      ? state.data.hero.subtitle
      : "อนุรักษ์สายพันธุ์ไทยด้วยข้อมูล ใบรับรอง และเทคโนโลยีที่ตรวจสอบได้";
  const primaryActionLabel =
    state.status === "success" ? state.data.hero.primaryAction.label : "ค้นหาควาย";

  return (
    <Screen activeTab="home">
      <ImageBackground source={heroImage} resizeMode="cover" style={styles.hero} imageStyle={styles.heroImage}>
        <View style={styles.heroScrim} />
        <View style={styles.heroContent}>
          <View style={styles.brandRow}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brand}>JAOTHUI</Text>
              <Text style={styles.brandSub}>Thai Buffalo Platform</Text>
            </View>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.headline}>Preserving Thai Buffalo Heritage</Text>
            <Text style={styles.copy}>{heroSubtitle}</Text>
            <View style={styles.actionsRow}>
              <Pressable style={styles.primaryButton} onPress={() => router.push("/buffalos")}>
                <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => router.push("/buffalos")}>
                <Text style={styles.secondaryButtonText}>ใบพันธุ์ประวัติ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>

      {state.status === "loading" ? (
        <HomeSkeleton />
      ) : null}

      {state.status === "error" ? (
        <StateBlock
          title="โหลดข้อมูลไม่สำเร็จ"
          message={state.error.message || "กรุณาลองใหม่อีกครั้ง"}
          actionLabel="ลองใหม่"
          onAction={state.reload}
        />
      ) : null}

      {state.status === "success" ? (
        <>
          <View style={styles.trustStrip}>
            <Text style={styles.trustLabel}>PUBLIC PEDIGREE</Text>
            <Text style={styles.trustText}>ข้อมูลจริงจากระบบ JAOTHUI สำหรับค้นหา ตรวจสอบ และดูใบรับรอง</Text>
          </View>

          <View style={styles.statsGrid}>
            {state.data.stats.map((item) => (
              <StatCard key={item.id} value={item.value} unit={item.unit} label={item.label} />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>กระบือแนะนำ</Text>
            <Pressable onPress={() => router.push("/buffalos")}>
              <Text style={styles.sectionAction}>ดูทั้งหมด</Text>
            </Pressable>
          </View>

          <View style={styles.featuredGrid}>
            {state.data.featured.slice(0, 4).map((buffalo) => (
              <BuffaloCard
                key={buffalo.microchip}
                buffalo={buffalo}
                onPress={() =>
                  router.push({
                    pathname: "/certs/[microchip]",
                    params: { microchip: buffalo.microchip },
                  })
                }
              />
            ))}
          </View>

          {state.data.featured.length === 0 ? (
            <StateBlock title="ยังไม่มีข้อมูลกระบือแนะนำ" message="กลับมาตรวจสอบรายการใหม่อีกครั้งภายหลัง" />
          ) : null}

          <NewsEventRail state={newsEventsState} onRetry={newsEventsState.reload} />
        </>
      ) : null}
    </Screen>
  );
}

function HomeSkeleton() {
  return (
    <>
      <View style={styles.skeletonStats}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.skeletonStatCard}>
            <Skeleton style={styles.skeletonValue} />
            <Skeleton style={styles.skeletonLabel} />
          </View>
        ))}
      </View>
      <View style={styles.sectionHeader}>
        <Skeleton style={styles.skeletonTitle} />
        <Skeleton style={styles.skeletonAction} />
      </View>
      <View style={styles.featuredGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.skeletonFeatureCard}>
            <Skeleton variant="image" />
            <View style={styles.skeletonFeatureBody}>
              <Skeleton style={styles.skeletonFeatureName} />
              <Skeleton style={styles.skeletonFeatureMeta} />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 432,
    overflow: "hidden",
    borderBottomLeftRadius: radius.nav,
    borderBottomRightRadius: radius.nav,
    justifyContent: "flex-end",
    marginHorizontal: -spacing.screenX,
    ...shadow.gold,
  },
  heroImage: {
    borderBottomLeftRadius: radius.nav,
    borderBottomRightRadius: radius.nav,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  heroContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.screenX,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  logo: {
    height: 42,
    width: 42,
  },
  brand: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandSub: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroText: {
    gap: spacing.sm,
    maxWidth: 330,
  },
  headline: {
    color: colors.foreground,
    fontSize: 33,
    lineHeight: 37,
    fontWeight: "900",
  },
  copy: {
    color: colors.muted,
    ...typography.body,
    maxWidth: 290,
  },
  actionsRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  trustStrip: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  trustLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  trustText: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 22,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.foreground,
    ...typography.sectionTitle,
  },
  sectionAction: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "800",
  },
  featuredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  skeletonStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: spacing.lg,
  },
  skeletonStatCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 92,
    padding: spacing.md,
  },
  skeletonValue: {
    height: 22,
    width: "58%",
  },
  skeletonLabel: {
    width: "82%",
  },
  skeletonTitle: {
    height: 20,
    width: 132,
  },
  skeletonAction: {
    height: 18,
    width: 72,
  },
  skeletonFeatureCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minWidth: 150,
    overflow: "hidden",
  },
  skeletonFeatureBody: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  skeletonFeatureName: {
    width: "72%",
  },
  skeletonFeatureMeta: {
    width: "56%",
  },
});
