import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getHome } from "@/api/jaothui";
import { BuffaloCard } from "@/components/BuffaloCard";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { colors, shadow, spacing } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";

export function HomeScreen() {
  const router = useRouter();
  const loadHome = useCallback(() => getHome(), []);
  const state = useAsyncResource(loadHome);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>JAOTHUI</Text>
        <Text style={styles.headline}>Preserving Thai Buffalo Heritage</Text>
        <Text style={styles.copy}>Mobile proof against the real JAOTHUI Mobile BFF.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/buffalos")}>
          <Text style={styles.primaryButtonText}>ค้นหาควาย</Text>
        </Pressable>
      </View>

      {state.status === "loading" ? (
        <StateBlock title="กำลังโหลดข้อมูล" message="กำลังเรียก Mobile BFF API" />
      ) : null}

      {state.status === "error" ? (
        <StateBlock
          title="โหลดข้อมูลไม่สำเร็จ"
          message={state.error.message}
          actionLabel="ลองใหม่"
          onAction={state.reload}
        />
      ) : null}

      {state.status === "success" ? (
        <>
          <View style={styles.statsGrid}>
            {state.data.stats.map((item) => (
              <View key={item.id} style={styles.statCard}>
                <Text style={styles.statValue}>
                  {item.value} <Text style={styles.statUnit}>{item.unit}</Text>
                </Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
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
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    justifyContent: "flex-end",
    gap: 10,
    marginHorizontal: -spacing.screenX,
    padding: spacing.screenX,
    paddingTop: 64,
    ...shadow.gold,
  },
  brand: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  headline: {
    color: colors.foreground,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    maxWidth: 320,
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 22,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 14,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
  },
  statUnit: {
    color: colors.gold,
    fontSize: 12,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: "900",
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
});
