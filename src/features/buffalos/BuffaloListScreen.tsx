import { useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { getBuffalos } from "@/api/jaothui";
import { BuffaloCard } from "@/components/BuffaloCard";
import { StateBlock } from "@/components/StateBlock";
import { colors, spacing } from "@/design/tokens";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { MobileBuffaloCard } from "@/types/mobile-api";

const EMPTY_BUFFALOS: MobileBuffaloCard[] = [];

export function BuffaloListScreen() {
  const router = useRouter();
  const loadBuffalos = useCallback(() => getBuffalos(1), []);
  const state = useAsyncResource(loadBuffalos);

  const keyExtractor = useCallback((buffalo: MobileBuffaloCard) => buffalo.microchip, []);

  const renderBuffalo = useCallback(
    ({ item }: { item: MobileBuffaloCard }) => (
      <BuffaloCard
        buffalo={item}
        onPress={() =>
          router.push({
            pathname: "/certs/[microchip]",
            params: { microchip: item.microchip },
          })
        }
      />
    ),
    [router]
  );

  const listData = state.status === "success" ? state.data.items : EMPTY_BUFFALOS;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderBuffalo}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={40}
        windowSize={5}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          <>
            <Header onBack={() => router.back()} />

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
              <Text style={styles.resultText}>
                หน้า {state.data.pagination.page} จาก {state.data.pagination.totalPages} ·{" "}
                {state.data.pagination.totalCount} รายการ
              </Text>
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
        <Text style={styles.title}>NFT เพชรดีกรี</Text>
        <Text style={styles.subtitle}>ข้อมูลจาก Mobile BFF API</Text>
      </View>
  );
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: spacing.screenX,
  },
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
  row: {
    gap: 12,
  },
  rowSeparator: {
    height: 12,
  },
});
