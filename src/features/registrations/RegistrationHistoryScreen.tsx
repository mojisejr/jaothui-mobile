import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { validEventId } from "@/auth/oauthIntentStorage";
import { eraseHistoryIntent, readHistoryIntent } from "@/notifications/historyIntent";
import { getEventRegistrations } from "@/api/events";
import type { ApplicantRegistrationStatus, RegistrationHistory, RegistrationStatus, RegistrationSummary } from "@/types/events";
import { spacing } from "@/design/tokens";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { RegistrationHistoryView } from "./RegistrationHistoryView";
import { ApplicantQrPanel } from "./ApplicantQrPanel";
import { CustomerGate } from "./CustomerGate";
import { eventPrivateRequest } from "./privateRequest";
import { eventAccountError, sameCustomer } from "./customer";
import { useRegistrationResource } from "./useRegistrationResource";
import { applicantTime } from "./applicantStatus";
import type { HistoryPeriod } from "./model";
import { EventButton } from "@/features/events/EventControls";
import { FormChoice, FormSelect, formStyles } from "./FormControls";
import { NotificationInvitation } from "@/notifications/NotificationInvitation";
export function RegistrationHistoryScreen() {
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
  const eventId = typeof params.eventId === "string" && validEventId(params.eventId) ? params.eventId : undefined;
  const [period, setPeriod] = useState<HistoryPeriod>(eventId ? "all" : "active"), [eventName, setEventName] = useState("");
  // Refresh only the pages already requested, retaining pagination and current statuses.
  const pages = useMemo(() => ({ count: 1, period, eventName, eventId }), [period, eventName, eventId]);
  const router = useRouter();
  const loader = useCallback(() => eventPrivateRequest(async session => {
    let history = await getEventRegistrations(session.sessionToken, undefined, period, eventName, eventId);
    for (let page = 1; page < pages.count && history.nextCursor; page++) {
      const next = await getEventRegistrations(session.sessionToken, history.nextCursor, period, eventName, eventId);
      history = { ...next, items: [...history.items, ...next.items.filter(item => !history.items.some(old => old.id === item.id))] };
    }
    if (eventId && (await readHistoryIntent())?.eventId === eventId) await eraseHistoryIntent();
    return history;
  }), [period, eventName, eventId, pages]);
  const resource = useRegistrationResource(loader, 30000);
  const [filter, setFilter] = useState<ApplicantRegistrationStatus | RegistrationStatus | "all">("all"), [paging, setPaging] = useState(false), [problem, setProblem] = useState<string | null>(null), [selected, setSelected] = useState<RegistrationSummary | null>(null);
  const lock = useRef(false), version = useRef(0), current = useRef(resource.data); current.current = resource.data;
  useEffect(() => { version.current++; lock.current = false; setPaging(false); setProblem(null); if (!resource.data) setSelected(null); }, [resource.data]);
  useFocusEffect(useCallback(() => () => { version.current++; setSelected(null); }, []));
  const history = resource.data?.value;
  const eventNames = history?.eventNames ?? [];
  const more = async () => {
    if (lock.current || !history?.nextCursor || !resource.data) return;
    lock.current = true; setPaging(true); setProblem(null); const request = ++version.current, data = resource.data;
    try {
      const next = await getEventRegistrations(data.session.sessionToken, history.nextCursor, period, eventName, eventId);
      if (request !== version.current || current.current !== data || !await sameCustomer(data.session)) return;
      const combined: RegistrationHistory = { ...next, items: [...history.items, ...next.items.filter(item => !history.items.some(old => old.id === item.id))] };
      if (resource.replace(data, combined)) pages.count++;
    } catch (failure) { if (request === version.current) setProblem(eventAccountError(failure)); }
    finally { if (request === version.current) { lock.current = false; setPaging(false); } }
  };
  return <Screen activeTab="profile" scroll={false}><View style={{ paddingHorizontal: spacing.screenX }}><Pressable accessibilityRole="button" onPress={() => router.replace("/profile")} style={formStyles.back}><Text style={formStyles.gold}>← โปรไฟล์</Text></Pressable><Text style={formStyles.title}>ประวัติการสมัคร</Text><View style={formStyles.choices}>{(["active", "past", "all"] as const).map(p => <FormChoice key={p} label={p === "active" ? "กิจกรรมปัจจุบัน" : p === "past" ? "กิจกรรมที่ผ่านมา" : "ทุกกิจกรรม"} selected={period === p} onPress={() => setPeriod(p)} />)}</View>{eventId ? <View><Text style={formStyles.hint}>แสดงเฉพาะงานที่แจ้งเตือน</Text><EventButton secondary label="ดูประวัติทุกงาน" onPress={() => router.replace("/registrations")} /></View> : <FormSelect label="ชื่องาน" value={eventName} options={["", ...eventNames]} disabled={resource.status !== "success"} emptyLabel="ทั้งหมด" onChange={setEventName} />}
    {history ? <><Text style={formStyles.hint}>ข้อมูลล่าสุด {applicantTime(resource.updatedAt)} (เวลาไทย)</Text><EventButton secondary label={resource.refreshing ? "กำลังโหลด…" : "โหลดข้อมูลล่าสุด"} disabled={resource.refreshing || paging} onPress={() => { void resource.reload(); }} />{resource.error ? <Text accessibilityRole="alert" style={formStyles.error}>โหลดข้อมูลล่าสุดไม่สำเร็จ ข้อมูลที่แสดงอาจยังไม่เป็นปัจจุบัน กรุณาเชื่อมต่อแล้วลองใหม่</Text> : null}</> : null}</View>
    {resource.status === "loading" ? <Skeleton variant="card" /> : resource.status === "error" ? <View style={{ paddingHorizontal: spacing.screenX }}><CustomerGate error={resource.error!} retry={() => { void resource.reload(); }} /></View> : history ? <RegistrationHistoryView header={resource.status === "success" && resource.data && history.items.length > 0 ? <NotificationInvitation session={resource.data.session} /> : null} period={period} eventName={eventName} items={history.items} filter={filter} onFilter={setFilter} onOpen={id => router.push({ pathname: "/registrations/[id]", params: { id } })} onQr={setSelected} onMore={() => { void more(); }} hasMore={!!history.nextCursor} loadingMore={paging} error={problem} /> : null}
    {selected && resource.data ? <ApplicantQrPanel key={selected.id} application={selected} onClose={() => setSelected(null)} onUpdated={() => { void resource.reload(); }} /> : null}
  </Screen>;
}
