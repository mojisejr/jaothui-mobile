import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getEventRegistrations } from "@/api/events";
import type { RegistrationHistory, RegistrationStatus } from "@/types/events";
import { spacing } from "@/design/tokens";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { useEventResource } from "@/features/events/useEventResource";
import { RegistrationHistoryView } from "./RegistrationHistoryView";
import { CustomerGate } from "./CustomerGate";
import { eventPrivateRequest } from "./privateRequest";
import { eventAccountError, sameCustomer } from "./customer";
import type { HistoryPeriod } from "./model";
import { FormChoice, FormSelect, formStyles } from "./FormControls";
export function RegistrationHistoryScreen() {
  const [period, setPeriod] = useState<HistoryPeriod>("active"), [eventName, setEventName] = useState("");
  const router = useRouter(), loader = useCallback(() => eventPrivateRequest(session => getEventRegistrations(session.sessionToken, undefined, period, eventName)), [period, eventName]), resource = useEventResource(loader);
  const [extra, setExtra] = useState<RegistrationHistory | null>(null), [filter, setFilter] = useState<RegistrationStatus | "all">("all"), [paging, setPaging] = useState(false), [problem, setProblem] = useState<string | null>(null);
  const lock = useRef(false), version = useRef(0), current = useRef(resource.data); current.current = resource.data;
  useEffect(() => { version.current++; lock.current = false; setExtra(null); setPaging(false); setProblem(null); }, [resource.data]);
  useFocusEffect(useCallback(() => () => { version.current++; }, []));
  const history = extra ?? resource.data?.value;
  const eventNames = resource.data?.value.eventNames ?? [];
  const more = async () => {
    if (lock.current || !history?.nextCursor || !resource.data) return;
    lock.current = true; setPaging(true); setProblem(null); const request = ++version.current, data = resource.data;
    try {
      const next = await getEventRegistrations(data.session.sessionToken, history.nextCursor, period, eventName);
      if (request !== version.current || current.current !== data || !await sameCustomer(data.session)) return;
      setExtra({ ...next, items: [...history.items, ...next.items.filter(item => !history.items.some(old => old.id === item.id))] });
    } catch (failure) { if (request === version.current) setProblem(eventAccountError(failure)); }
    finally { if (request === version.current) { lock.current = false; setPaging(false); } }
  };
  return <Screen activeTab="profile" scroll={false}><View style={{ paddingHorizontal: spacing.screenX }}><Pressable accessibilityRole="button" onPress={() => router.replace("/profile")} style={formStyles.back}><Text style={formStyles.gold}>← โปรไฟล์</Text></Pressable><Text style={formStyles.title}>ประวัติการสมัคร</Text><View style={formStyles.choices}>{(["active", "past", "all"] as const).map(p => <FormChoice key={p} label={p === "active" ? "กิจกรรมปัจจุบัน" : p === "past" ? "กิจกรรมที่ผ่านมา" : "ทุกกิจกรรม"} selected={period === p} onPress={() => setPeriod(p)} />)}</View><FormSelect label="ชื่องาน" value={eventName} options={["", ...eventNames]} disabled={resource.status !== "success"} emptyLabel="ทั้งหมด" onChange={setEventName} /></View>
    {resource.status === "loading" ? <Skeleton variant="card" /> : resource.status === "error" ? <View style={{ paddingHorizontal: spacing.screenX }}><CustomerGate error={resource.error} retry={resource.reload} /></View> : history ? <RegistrationHistoryView period={period} eventName={eventName} items={history.items} filter={filter} onFilter={setFilter} onOpen={id => router.push({ pathname: "/registrations/[id]", params: { id } })} onMore={() => { void more(); }} hasMore={!!history.nextCursor} loadingMore={paging} error={problem} /> : null}
  </Screen>;
}
