import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/design/tokens";
import type { RegistrationStatus, RegistrationSummary } from "@/types/events";
import { eventDayLabel } from "@/features/events/model";
import { StateBlock } from "@/components/StateBlock";
import { EventButton } from "@/features/events/EventControls";
import { FormChoice, formStyles } from "./FormControls";
import { registrationStatusLabel, historyStatusLabel, registrationActive, type HistoryPeriod } from "./model";
export function RegistrationHistoryView({ items, filter, onFilter, period = "active", eventName = "", onOpen, onMore, hasMore, loadingMore, error }: { items: RegistrationSummary[]; period?: HistoryPeriod; eventName?: string; filter: RegistrationStatus | "all"; onFilter: (filter: RegistrationStatus | "all") => void; onOpen: (id: string) => void; onMore: () => void; hasMore: boolean; loadingMore: boolean; error?: string | null }) {
  const visible = items.filter(item => (filter === "all" || item.status === filter) && (period === "all" || registrationActive(item) === (period === "active")) && (!eventName || item.event.name === eventName));
  return <View style={styles.container}><View style={styles.filters}>{(["all", "registered", "pending", "approved", "rejected"] as const).map(status => <FormChoice key={status} label={status === "all" ? "ทั้งหมด" : registrationStatusLabel[status]} selected={filter === status} onPress={() => onFilter(status)} />)}</View>
    <FlatList<RegistrationSummary> data={visible} keyExtractor={item => item.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.buffalo.name} ${item.event.name} ${historyStatusLabel(item)}`} onPress={() => onOpen(item.id)} style={styles.item}><Text style={formStyles.section}>{item.buffalo.name}</Text><Text style={formStyles.body}>{item.event.name}</Text><Text style={formStyles.hint}>{eventDayLabel(item.event.startDay?.slice(0, 10) ?? null)} · {item.buffalo.type}</Text><Text style={formStyles.gold}>{historyStatusLabel(item)}</Text></Pressable>}
      ListEmptyComponent={<StateBlock title={items.length ? "ยังไม่มีรายการในสถานะนี้" : "ยังไม่มีประวัติการสมัคร"} message={hasMore ? "เลื่อนดูรายการก่อนหน้าเพิ่มเติมได้ด้านล่าง" : "เมื่อสมัครประกวดแล้ว ใบสมัครจะปรากฏที่นี่"} />}
      ListFooterComponent={<View style={formStyles.actions}>{error ? <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text> : null}{hasMore ? <EventButton secondary label={loadingMore ? "กำลังโหลด…" : "โหลดประวัติก่อนหน้า"} disabled={loadingMore} onPress={onMore} /> : null}</View>} />
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, paddingHorizontal: spacing.screenX }, filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xxs, marginVertical: spacing.md }, list: { paddingBottom: spacing.xl }, item: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.card, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm } });
