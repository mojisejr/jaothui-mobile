import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { getOpenEvents } from "@/api/events";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { colors, radius, spacing, typography } from "@/design/tokens";
import type { EventSummary } from "@/types/events";
import { useStatEnvironment } from "../home/useStatEnvironment";
import { homeEventItems, shouldAutoplay, stableEventIndex } from "./model";
import { useEventResource } from "./useEventResource";
import { EventPreviewCard } from "./EventPreviewCard";

export function HomeEventZone({ visible, onLayout }: { visible: boolean; onLayout: (event: LayoutChangeEvent) => void }) {
  const router = useRouter(), { width } = useWindowDimensions();
  const loader = useCallback((signal: AbortSignal) => getOpenEvents({ limit: 5 }, signal), []), state = useEventResource(loader);
  const { active, reduceMotion } = useStatEnvironment();
  const [screenReader, setScreenReader] = useState<boolean | null>(null), [paused, setPaused] = useState(false), [interacting, setInteracting] = useState(false);
  const [index, setIndex] = useState(0), indexRef = useRef(0), selectedId = useRef<string | null>(null), list = useRef<FlatList<EventSummary>>(null);
  const items = useMemo(() => state.status === "success" ? homeEventItems(state.data.items) : [], [state.status, state.data]);
  const cardWidth = Math.max(240, width - spacing.screenX * 2), stride = cardWidth + spacing.sm;
  useEffect(() => {
    let current = true, observed = false;
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", value => { observed = true; if (current) setScreenReader(value); });
    AccessibilityInfo.isScreenReaderEnabled().then(value => { if (current && !observed) setScreenReader(value); }).catch(() => { if (current) setScreenReader(null); });
    return () => { current = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (state.status !== "success") return;
    const next = stableEventIndex(items, selectedId.current, indexRef.current);
    if (items[next]) selectedId.current = items[next].id;
    indexRef.current = next; setIndex(next);
    list.current?.scrollToOffset({ offset: stride * next, animated: false });
  }, [items, stride, state.status]);
  const go = useCallback((next: number, animated = true) => { if (!items[next]) return; selectedId.current = items[next].id; indexRef.current = next; setIndex(next); list.current?.scrollToOffset({ offset: next * stride, animated }); }, [items, stride]);
  const autoplay = shouldAutoplay({ count: items.length, visible, active, reduceMotion, screenReader, paused, interacting });
  useEffect(() => { if (!autoplay) return; const timer = setTimeout(() => go((index + 1) % items.length), 5500); return () => clearTimeout(timer); }, [autoplay, go, index, items.length]);
  if (state.status === "success" && items.length === 0) return null;
  return <View style={styles.zone} onLayout={onLayout} testID="home-event-zone">
    <View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.kicker}>JAOTHUI COMPETITION</Text><Text style={styles.title}>เปิดรับสมัครประกวด</Text></View>
      {items.length > 1 && reduceMotion === false && screenReader === false ? <Pressable accessibilityRole="button" accessibilityLabel={paused ? "เล่นสไลด์อัตโนมัติ" : "พักสไลด์อัตโนมัติ"} onPress={() => setPaused(value => !value)} style={styles.touch}><Text style={styles.pause}>{paused ? "เล่น" : "พัก"}</Text></Pressable> : null}
      {state.status === "success" && state.data.totalOpen > 5 ? <Pressable accessibilityRole="button" onPress={() => router.push("/events")} style={styles.touch}><Text style={styles.link}>ดูทั้งหมด</Text></Pressable> : null}</View>
    {state.status === "loading" ? <Skeleton variant="image" style={styles.loading} /> : state.status === "error" ? <StateBlock title="โหลดรายการประกวดไม่สำเร็จ" message="ส่วนอื่นของหน้าหลักยังใช้งานได้ตามปกติ" actionLabel="ลองใหม่" onAction={state.reload} /> : <>
      <FlatList ref={list} data={items} horizontal snapToInterval={stride} decelerationRate="fast" showsHorizontalScrollIndicator={false} keyExtractor={item => item.id}
        renderItem={({ item }) => <EventPreviewCard event={item} width={cardWidth} onPress={() => router.push({ pathname: "/events/[eventId]", params: { eventId: item.id } })} />}
        ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />} getItemLayout={(_, i) => ({ length: stride, offset: stride * i, index: i })}
        initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews={false}
        onScrollBeginDrag={() => setInteracting(true)} onScrollEndDrag={() => setInteracting(false)} onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onTouchCancel={() => setInteracting(false)}
        onMomentumScrollBegin={() => setInteracting(true)} onMomentumScrollEnd={event => { setInteracting(false); const next = Math.round(event.nativeEvent.contentOffset.x / stride); if (items[next]) { selectedId.current = items[next].id; indexRef.current = next; setIndex(next); } }} />
      <View style={styles.pagination}><View style={styles.dots} accessibilityLabel={`กิจกรรม ${index + 1} จาก ${items.length}`}>
        {items.map((item, i) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`กิจกรรม ${i + 1} จาก ${items.length}`} accessibilityState={{ selected: index === i }} onPress={() => { setPaused(true); go(i); }} style={styles.dotTouch}><View style={[styles.dot, i === index && styles.selectedDot]} /></Pressable>)}
      </View></View>
    </>}
  </View>;
}
const styles = StyleSheet.create({ zone: { marginTop: spacing.xl }, heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs, marginBottom: spacing.sm }, headingCopy: { flex: 1 }, kicker: { ...typography.caption, color: colors.gold, letterSpacing: 0.8, marginBottom: spacing.xxs }, title: { ...typography.sectionTitle, color: colors.foreground }, touch: { minHeight: spacing.touchTarget, minWidth: spacing.touchTarget, justifyContent: "center", alignItems: "center" }, link: { ...typography.body, color: colors.gold, fontWeight: "700" }, loading: { height: 260, borderRadius: radius.card }, pagination: { flexDirection: "row", justifyContent: "center", alignItems: "center", position: "relative" }, dots: { flexDirection: "row", justifyContent: "center" }, dotTouch: { width: spacing.touchTarget, height: spacing.touchTarget, alignItems: "center", justifyContent: "center" }, dot: { width: spacing.xs, height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.muted, opacity: 0.45 }, selectedDot: { width: spacing.lg, opacity: 1, backgroundColor: colors.gold }, pause: { ...typography.label, color: colors.gold } });
