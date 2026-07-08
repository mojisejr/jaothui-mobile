import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getCertDetail } from "@/api/jaothui";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { colors, shadow, spacing } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";

export function CertDetailScreen() {
  const router = useRouter();
  const { microchip } = useLocalSearchParams<{ microchip: string }>();
  const loadCertDetail = useCallback(() => getCertDetail(microchip), [microchip]);
  const state = useAsyncResource(loadCertDetail);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
      </View>

      {state.status === "loading" ? (
        <StateBlock title="กำลังโหลดใบพันธุ์ประวัติ" message={microchip} />
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
        <View style={styles.card}>
          {state.data.buffalo.imageUrl ? (
            <Image source={{ uri: state.data.buffalo.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}
          <View style={styles.body}>
            <Text style={styles.label}>ใบพันธุ์ประวัติ</Text>
            <Text style={styles.name}>{state.data.buffalo.name}</Text>
            <Text style={styles.microchip}>{state.data.buffalo.microchip}</Text>

            <View style={styles.detailGrid}>
              <Info label="เพศ" value={state.data.buffalo.sex} />
              <Info label="สี" value={state.data.buffalo.color} />
              <Info label="อายุ" value={formatAge(state.data.buffalo.ageMonths)} />
              <Info label="เลขใบรับรอง" value={state.data.buffalo.certNo} />
            </View>

            <Text style={styles.detail}>{state.data.buffalo.detail || "ไม่มีรายละเอียดเพิ่มเติม"}</Text>

            <View style={styles.rewardBox}>
              <Text style={styles.rewardTitle}>รางวัล</Text>
              <Text style={styles.rewardText}>
                {state.data.rewards.length > 0
                  ? `${state.data.rewards.length} รายการ`
                  : "ยังไม่มีข้อมูลรางวัล"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

function formatAge(months: number | null) {
  if (!months || months < 1) return "น้อยกว่า 1 เดือน";
  return `${Math.floor(months)} เดือน`;
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    marginTop: 18,
    overflow: "hidden",
    ...shadow.gold,
  },
  image: {
    aspectRatio: 4 / 3,
    width: "100%",
  },
  body: {
    padding: 18,
  },
  label: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },
  microchip: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  info: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 18,
  },
  rewardBox: {
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  rewardTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  rewardText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
});
