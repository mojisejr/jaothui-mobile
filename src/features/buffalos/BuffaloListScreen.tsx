import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getBuffalos } from "@/api/jaothui";
import { BuffaloCard } from "@/components/BuffaloCard";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { colors, spacing } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";

export function BuffaloListScreen() {
  const router = useRouter();
  const loadBuffalos = useCallback(() => getBuffalos(1), []);
  const state = useAsyncResource(loadBuffalos);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
        <Text style={styles.title}>NFT เพชรดีกรี</Text>
        <Text style={styles.subtitle}>ข้อมูลจาก Mobile BFF API</Text>
      </View>

      {state.status === "loading" ? (
        <StateBlock title="กำลังโหลดรายการ" message="กำลังเรียก /api/mobile/v1/buffalos" />
      ) : null}

      {state.status === "error" ? (
        <StateBlock
          title="โหลดรายการไม่สำเร็จ"
          message={state.error.message}
          actionLabel="ลองใหม่"
          onAction={state.reload}
        />
      ) : null}

      {state.status === "success" ? (
        <>
          <Text style={styles.resultText}>
            หน้า {state.data.pagination.page} จาก {state.data.pagination.totalPages} ·{" "}
            {state.data.pagination.totalCount} รายการ
          </Text>
          <View style={styles.grid}>
            {state.data.items.map((buffalo) => (
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
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 18,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  resultText: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
