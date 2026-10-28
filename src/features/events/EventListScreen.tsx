import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { getOpenEvents } from "@/api/events";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { Skeleton } from "@/components/Skeleton";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { EventList, EventQuery, EventSummary } from "@/types/events";
import { EventButton } from "./EventControls";
import { EventPreviewCard } from "./EventPreviewCard";
import { createLatestRequestGate, formatCalendarInput, parseCalendarInput } from "./model";

export function EventListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState(""), [debounced, setDebounced] = useState({ q: "" }), [showDates, setShowDates] = useState(false);
  const [fromInput, setFromInput] = useState(""), [toInput, setToInput] = useState(""), [dates, setDates] = useState<Pick<EventQuery, "from" | "to">>({});
  const [dateError, setDateError] = useState<string | null>(null), [result, setResult] = useState<EventList | null>(null), [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null), [paging, setPaging] = useState(false);
  const gate = useRef(createLatestRequestGate()).current, controller = useRef<AbortController | null>(null), pagingRef = useRef(false), latest = useRef<EventList | null>(null);
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) { firstSearch.current = false; return; }
    const timer = setTimeout(() => setDebounced({ q: search.trim() }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(() => {
    const request = gate.start(); controller.current?.abort(); const next = new AbortController(); controller.current = next;
    setStatus("loading"); setError(null); setResult(null); latest.current = null; pagingRef.current = false; setPaging(false);
    getOpenEvents({ q: debounced.q, ...dates, limit: 20 }, next.signal).then(data => { if (gate.current(request)) { latest.current = data; setResult(data); setStatus("ready"); } })
      .catch(problem => { if (gate.current(request)) { setError(problem instanceof Error ? problem.message : "กรุณาลองใหม่"); setStatus("error"); } });
  }, [dates, debounced, gate]);
  useEffect(() => { load(); return () => { gate.invalidate(); controller.current?.abort(); }; }, [gate, load]);
  const loadMore = useCallback(async () => {
    if (pagingRef.current || !latest.current?.nextCursor) return;
    pagingRef.current = true; setPaging(true); const request = gate.start(), previous = latest.current;
    try {
      const data = await getOpenEvents({ q: debounced.q, ...dates, limit: 20, cursor: previous.nextCursor! });
      if (!gate.current(request)) return;
      const combined = { ...data, items: [...previous.items, ...data.items.filter(item => !previous.items.some(old => old.id === item.id))] };
      latest.current = combined; setResult(combined); setError(null);
    } catch (problem) { if (gate.current(request)) setError(problem instanceof Error ? problem.message : "โหลดรายการถัดไปไม่สำเร็จ"); }
    finally { if (gate.current(request)) { pagingRef.current = false; setPaging(false); } }
  }, [dates, debounced, gate]);
  const applyDates = () => {
    const from = parseCalendarInput(fromInput), to = parseCalendarInput(toInput);
    if (from.error || to.error || (from.day && to.day && from.day > to.day)) { setDateError(from.error ?? to.error ?? "วันเริ่มต้นต้องไม่เกินวันสิ้นสุด"); return; }
    setDateError(null); setDates({ from: from.day, to: to.day }); setShowDates(false);
  };
  return <Screen activeTab="home" scroll={false}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="กลับหน้าหลัก" onPress={() => router.replace("/")} style={styles.back}><Text style={styles.backText}>←</Text></Pressable><Text style={styles.title}>รายการประกวด</Text></View>
    <View style={styles.filters}>
      <TextInput accessibilityLabel="ค้นหาชื่องานประกวด" placeholder="ค้นหาชื่องานประกวด" placeholderTextColor={colors.muted} value={search} maxLength={100} onChangeText={value => { gate.invalidate(); controller.current?.abort(); latest.current = null; setStatus("loading"); setSearch(value); }} style={styles.input} returnKeyType="search" autoCorrect={false} />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDates }} onPress={() => setShowDates(value => !value)} style={styles.filterToggle}><Text style={styles.filterText}>{dates.from || dates.to ? "กรองวันแข่งขันแล้ว · แก้ไข" : "เลือกช่วงวันแข่งขัน"}</Text><Text style={styles.filterText}>{showDates ? "−" : "+"}</Text></Pressable>
      {showDates ? <View style={styles.dateFields}>
        <Text style={styles.hint}>วันแข่งขันที่อยู่ในช่วงที่เลือก · วว/ดด/ปปปป</Text>
        <Text style={styles.label}>ตั้งแต่วันที่</Text><TextInput accessibilityLabel="วันแข่งขันตั้งแต่วันที่" placeholder="เช่น 29/10/2569" placeholderTextColor={colors.muted} keyboardType="number-pad" value={fromInput} onChangeText={value => setFromInput(formatCalendarInput(value))} style={styles.input} maxLength={10} />
        <Text style={styles.label}>ถึงวันที่</Text><TextInput accessibilityLabel="วันแข่งขันถึงวันที่" placeholder="เช่น 31/10/2569" placeholderTextColor={colors.muted} keyboardType="number-pad" value={toInput} onChangeText={value => setToInput(formatCalendarInput(value))} style={styles.input} maxLength={10} />
        {dateError ? <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text> : null}
        <View style={styles.actions}><EventButton label="ล้างวันที่" secondary onPress={() => { setFromInput(""); setToInput(""); setDates({}); setDateError(null); }} /><EventButton label="ใช้วันที่นี้" onPress={applyDates} /></View>
      </View> : null}
      {status === "ready" ? <Text accessibilityLiveRegion="polite" style={styles.hint}>พบ {result?.items.length ?? 0} รายการ{result?.nextCursor ? " · เลื่อนเพื่อดูเพิ่ม" : ""}</Text> : null}
    </View>
    {status === "loading" ? <View style={styles.loading}><Skeleton style={styles.skeleton} /><Skeleton style={styles.skeleton} /></View> : status === "error" ? <View style={styles.empty}><StateBlock title="โหลดรายการไม่สำเร็จ" message={error ?? "กรุณาลองใหม่"} actionLabel="ลองใหม่" onAction={load} /></View> : <FlatList<EventSummary>
      data={result?.items ?? []} keyExtractor={item => item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => <EventPreviewCard compact event={item} onPress={() => router.push({ pathname: "/events/[eventId]", params: { eventId: item.id } })} />}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={7} onEndReached={() => { void loadMore(); }} onEndReachedThreshold={0.4}
      ListEmptyComponent={<StateBlock title="ไม่พบรายการที่เปิดรับสมัคร" message={search || dates.from || dates.to ? "ลองเปลี่ยนชื่อหรือช่วงวันแข่งขัน" : "กลับมาติดตามงานประกวดใหม่ได้ภายหลัง"} />}
      ListFooterComponent={paging ? <Text style={styles.hint}>กำลังโหลดเพิ่มเติม…</Text> : error ? <StateBlock title="โหลดรายการถัดไปไม่สำเร็จ" message={error} actionLabel="ลองใหม่" onAction={() => { void loadMore(); }} /> : null} />}
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.screenX, gap: spacing.xs }, back: { minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: "flex-start", justifyContent: "center" }, backText: { ...typography.sectionTitle, color: colors.gold }, title: { ...typography.sectionTitle, color: colors.foreground, flex: 1 }, filters: { paddingHorizontal: spacing.screenX, paddingBottom: spacing.sm, gap: spacing.xs }, input: { minHeight: spacing.touchTarget, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.foreground, ...typography.body }, filterToggle: { minHeight: spacing.touchTarget, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, filterText: { ...typography.body, color: colors.gold }, hint: { ...typography.label, color: colors.muted, paddingVertical: spacing.xs }, label: { ...typography.body, color: colors.foreground }, dateFields: { gap: spacing.xs, paddingBottom: spacing.sm }, actions: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }, error: { ...typography.body, color: colors.danger }, list: { paddingHorizontal: spacing.screenX, paddingBottom: spacing.xl }, loading: { paddingHorizontal: spacing.screenX, gap: spacing.sm }, skeleton: { height: 156, borderRadius: radius.card }, empty: { paddingHorizontal: spacing.screenX } });
