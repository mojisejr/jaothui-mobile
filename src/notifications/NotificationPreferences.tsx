import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";
import type { MobileSession } from "@/types/mobile-api";
import { SettingsRow } from "@/components/SettingsRow";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { currentSessionGeneration } from "@/auth/sessionLifecycle";
import { notificationService, type NotificationState } from "./service";

const copy: Record<NotificationState, string> = { loading: "กำลังตรวจสอบ…", saving: "กำลังบันทึก…", unavailable: "ยังไม่เปิดให้ใช้งาน", paused: "ปิดการรับแจ้งเตือน", "pending-disable": "รอยืนยันการปิด", unsupported: "ยังไม่รองรับอุปกรณ์นี้", disabled: "ยังไม่เปิด", enabled: "เปิดแล้ว", blocked: "ถูกบล็อกในการตั้งค่า", error: "บันทึกไม่สำเร็จ" };
export function NotificationPreferences({ session }: { session: MobileSession }) {
  const [state, setState] = useState<NotificationState>("loading");
  const [problem, setProblem] = useState<string | null>(null);
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const reload = useCallback(async () => {
    const request = ++revision.current;
    const generation = currentSessionGeneration();
    try { const next = await notificationService.status(session); if (request === revision.current && generation === currentSessionGeneration()) setState(next); }
    catch { if (request === revision.current && generation === currentSessionGeneration()) { setState("error"); setProblem("ยังตรวจสอบการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่"); } }
  }, [session]);
  useEffect(() => {
    setState("loading"); setProblem(null); void reload();
    const listener = AppState.addEventListener("change", value => { if (value === "active") void reload(); });
    return () => { invalidate(); listener.remove(); };
  }, [reload, invalidate]);
  const act = async () => {
    if (state === "blocked") { await Linking.openSettings(); return; }
    const request = ++revision.current;
    const generation = currentSessionGeneration();
    setState("saving"); setProblem(null);
    try {
      const next = state === "enabled" || state === "paused" || state === "pending-disable" ? (await notificationService.disable(session) ? "disabled" : "pending-disable") : await notificationService.enable(session);
      if (request !== revision.current || generation !== currentSessionGeneration()) return;
      setState(next);
      if (next === "pending-disable") setProblem("ปิดบนอุปกรณ์นี้แล้ว แต่ยังรอยืนยันกับระบบเมื่อกลับมาออนไลน์");
    } catch {
      if (request === revision.current && generation === currentSessionGeneration()) { setState("error"); setProblem("ยังบันทึกการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่"); }
    }
  };
  return <View style={styles.section}>
    <Text style={styles.title}>การแจ้งเตือนการแข่งขัน</Text>
    <Text style={styles.description}>เตือนงานที่คุณสมัครและเข้าเกณฑ์ ก่อนวันงาน 1 วัน เวลา 09:00 น. (เวลาไทย)</Text>
    {state === "paused" ? <Text style={styles.description}>ระบบยังไม่เปิดส่ง คุณยังปิดการรับบนอุปกรณ์นี้ได้</Text> : null}
    <SettingsRow label="แจ้งเตือนบนอุปกรณ์นี้" right={copy[state]} disabled={["loading", "saving", "unavailable", "unsupported"].includes(state)} disabledCaption={null} onPress={() => { void act(); }} accessibilityHint={state === "enabled" || state === "paused" ? "ปิดการแจ้งเตือนบนอุปกรณ์นี้" : state === "blocked" ? "เปิดการตั้งค่าอุปกรณ์เพื่ออนุญาตแจ้งเตือน" : "เปิดการแจ้งเตือนบนอุปกรณ์นี้"} testID="competition-notifications" />
    {problem ? <Text accessibilityRole="alert" style={styles.problem}>{problem}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ section: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: spacing.md, gap: spacing.xs }, title: { ...typography.sectionTitle, color: colors.foreground }, description: { ...typography.body, color: colors.muted }, problem: { ...typography.body, color: colors.warning } });
