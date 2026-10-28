import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { getEventDetail, getEventMember } from "@/api/events";
import { MobileApiError } from "@/api/client";
import { loadMobileSession, MobileSessionStorageError } from "@/auth/sessionStorage";
import { openLineAccountAuthSession } from "@/auth/lineAccount";
import { openEventLineLink } from "@/auth/eventLineLink";
import { recoverRejectedMobileSession } from "../profile/sessionRecovery";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { EventButton } from "./EventControls";
import { eventDayLabel } from "./model";
import { validEventId } from "@/auth/oauthIntentStorage";
import { useEventResource } from "./useEventResource";

const logo = require("@/assets/images/thuiLogo.png");
function accountErrorMessage(error: unknown, fallback: string) {
  if (error instanceof MobileSessionStorageError) return "อุปกรณ์นี้ยังไม่พร้อมสำหรับการเข้าสู่ระบบอย่างปลอดภัย กรุณาลองใหม่ภายหลัง";
  return error instanceof Error ? error.message : fallback;
}
type ApplyState = "idle" | "checking" | "login" | "link" | "working";
export function EventDetailScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ eventId: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const loader = useCallback((signal: AbortSignal) => validEventId(eventId) ? getEventDetail(eventId, signal) : Promise.reject(new MobileApiError("ไม่พบกิจกรรม", "EVENT_NOT_FOUND", 404)), [eventId]);
  const state = useEventResource(loader);
  const [apply, setApply] = useState<ApplyState>("idle"), [problem, setProblem] = useState<string | null>(null);
  const continueApply = async () => {
    setApply("checking"); setProblem(null);
    try {
      const fresh = await getEventDetail(eventId);
      if (fresh.policy.publicRegistration !== "open") { state.reload(); setApply("idle"); setProblem("กิจกรรมนี้ปิดรับสมัครแล้ว"); return; }
      const session = await loadMobileSession();
      if (!session || session.identity.sessionVersion !== 2 || !["line", "apple"].includes(session.identity.provider)) { setApply("login"); return; }
      try {
        const result = await getEventMember(session.sessionToken);
        if ((await loadMobileSession())?.sessionToken !== session.sessionToken) throw new Error("บัญชีเปลี่ยนแล้ว กรุณากดสมัครอีกครั้ง");
        router.push({ pathname: result.member ? "/events/[eventId]/register" : "/events/[eventId]/member", params: { eventId } });
        setApply("idle");
      } catch (error) {
        if (error instanceof MobileApiError && error.code === "LINE_LINK_REQUIRED") { setApply("link"); return; }
        if ((await loadMobileSession())?.sessionToken !== session.sessionToken) throw new Error("บัญชีเปลี่ยนแล้ว กรุณากดสมัครอีกครั้ง");
        if (await recoverRejectedMobileSession(error)) { setApply("login"); return; }
        throw error;
      }
    } catch (error) { setProblem(accountErrorMessage(error, "ตรวจสอบสิทธิ์สมัครไม่สำเร็จ")); setApply("idle"); }
  };
  const authenticate = async (link: boolean) => {
    setApply("working"); setProblem(null);
    try {
      const result = link ? await openEventLineLink(eventId) : await openLineAccountAuthSession(eventId);
      setApply("idle");
      if (result.ok) { router.replace((result.target ?? `/events/${encodeURIComponent(eventId)}`) as Href); state.reload(); }
      else { setProblem("ยกเลิกการเชื่อมต่อแล้ว ข้อมูลบัญชีเดิมยังอยู่"); }
    } catch (error) { setApply("idle"); setProblem(accountErrorMessage(error, "ยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่")); }
  };
  const open = state.status === "success" && state.data.policy.publicRegistration === "open";
  return <Screen activeTab="home">
    <View style={styles.header}><Pressable style={styles.back} accessibilityRole="button" accessibilityLabel="กลับรายการประกวด" onPress={() => router.replace("/events")}><Text style={styles.backText}>← รายการประกวด</Text></Pressable></View>
    {state.status === "loading" ? <><Skeleton variant="image" style={styles.poster} /><Skeleton style={styles.titleSkeleton} /></> : state.status === "error" ? <StateBlock title={state.error instanceof MobileApiError && state.error.status === 404 ? "ไม่พบกิจกรรมนี้" : "โหลดรายละเอียดไม่สำเร็จ"} message="คุณยังสามารถกลับไปค้นหารายการอื่นได้" actionLabel="ลองใหม่" onAction={state.reload} /> : <>
      <Text style={styles.kicker}>{state.data.formKind === "royal" ? "ROYAL COMPETITION" : "JAOTHUI COMPETITION"}</Text>
      <Text style={styles.title}>{state.data.name}</Text>
      <View style={styles.poster}>{state.data.imageUrl ? <Image source={{ uri: state.data.imageUrl }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : <Image source={logo} resizeMode="contain" style={styles.logo} />}</View>
      <View style={styles.facts}><Text style={styles.label}>วันแข่งขัน</Text><Text style={styles.body}>{eventDayLabel(state.data.competitionStartDay)}{state.data.competitionEndDay && state.data.competitionEndDay !== state.data.competitionStartDay ? ` – ${eventDayLabel(state.data.competitionEndDay)}` : ""}</Text>
        {state.data.location ? <><Text style={styles.label}>สถานที่</Text><Text style={styles.body}>{state.data.location}</Text></> : null}
        <Text style={styles.label}>ปิดรับสมัคร</Text><Text style={styles.body}>{eventDayLabel(state.data.registrationDeadline)}</Text>
        <Text style={styles.label}>วันตัดอายุกระบือ</Text><Text style={styles.body}>{eventDayLabel(state.data.ageCutoffDay)}</Text>
      </View>
      {state.data.description ? <Text style={styles.description}>{state.data.description}</Text> : null}
      {!open ? <StateBlock title="กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้" message="สามารถอ่านรายละเอียดและดูรายการประกวดอื่นได้" /> : null}
      {problem ? <Text accessibilityRole="alert" style={styles.error}>{problem}</Text> : null}
      {apply === "login" ? <View style={styles.applyPanel}><Text style={styles.body}>เข้าสู่ระบบด้วย LINE เพื่อสมัครประกวด โดยยังไม่ต้องเชื่อมกระเป๋าเงิน</Text><EventButton label="เข้าสู่ระบบด้วย LINE" onPress={() => { void authenticate(false); }} /><EventButton secondary label="ยังไม่สมัคร" onPress={() => setApply("idle")} /></View> : apply === "link" ? <View style={styles.applyPanel}><Text style={styles.body}>เชื่อม LINE กับบัญชี JAOTHUI นี้เพื่อใช้สมาชิกชุดเดียวกับระบบประกวด บัญชี Apple และกระเป๋าเงินเดิมยังอยู่</Text><EventButton label="เชื่อม LINE กับบัญชีนี้" onPress={() => { void authenticate(true); }} /><EventButton secondary label="ไว้ภายหลัง" onPress={() => setApply("idle")} /></View> : <View style={styles.action}><EventButton label={apply === "checking" || apply === "working" ? "กำลังตรวจสอบ…" : "สมัครประกวด"} disabled={!open || apply !== "idle"} onPress={() => { void continueApply(); }} /></View>}
      <Text style={styles.note}>หลังยืนยันตัวตน คุณจะกลับมาที่กิจกรรมนี้เพื่อตรวจข้อมูลและกดดำเนินการเอง</Text>
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ header: { marginTop: spacing.xs, marginBottom: spacing.sm }, back: { minHeight: spacing.touchTarget, justifyContent: "center" }, backText: { ...typography.body, color: colors.gold, fontWeight: "700" }, kicker: { ...typography.label, color: colors.gold, letterSpacing: 0.8 }, title: { ...typography.screenTitle, color: colors.foreground, marginTop: spacing.xs, marginBottom: spacing.lg }, poster: { aspectRatio: 16 / 10, backgroundColor: colors.surfaceRaised, borderRadius: radius.card, overflow: "hidden", alignItems: "center", justifyContent: "center" }, logo: { width: 64, height: 64 }, facts: { gap: spacing.xs, paddingVertical: spacing.xl, borderBottomColor: colors.borderSoft, borderBottomWidth: 1 }, label: { ...typography.label, color: colors.gold, marginTop: spacing.xs }, body: { ...typography.body, color: colors.foreground }, description: { ...typography.body, color: colors.foreground, marginTop: spacing.xl }, action: { marginTop: spacing.xl }, applyPanel: { gap: spacing.sm, marginTop: spacing.xl }, error: { ...typography.body, color: colors.danger, marginTop: spacing.lg }, note: { ...typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.lg }, titleSkeleton: { height: 34, marginTop: spacing.lg } });
