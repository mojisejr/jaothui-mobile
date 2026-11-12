import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { MobileSession } from "@/types/mobile-api";
import { currentSessionGeneration } from "@/auth/sessionLifecycle";
import { colors, radius, spacing, typography } from "@/design/tokens";
import { EventButton } from "@/features/events/EventControls";
import { notificationAccount, notificationService } from "./service";
import { dismissInvitation, invitationDismissed } from "./invitationDismissal";

type State = { accountId: string; token: string; status: "hidden" | "visible" | "saving" | "error" };
export function NotificationInvitation({ session }: { session: MobileSession }) {
  const accountId = notificationAccount(session);
  const token = session.sessionToken;
  const [state, setState] = useState<State | null>(null);
  const latestSession = useRef(session); latestSession.current = session;
  const active = useRef(false), revision = useRef(0), busy = useRef(false);
  const refresh = useCallback(async () => {
    if (!active.current || busy.current || !accountId || token !== latestSession.current.sessionToken) return;
    const request = ++revision.current, generation = currentSessionGeneration(), current = latestSession.current;
    const valid = () => active.current && request === revision.current && generation === currentSessionGeneration() && current.sessionToken === latestSession.current.sessionToken && notificationAccount(latestSession.current) === accountId;
    try {
      if (await invitationDismissed(accountId)) { if (valid()) setState({ accountId, token: current.sessionToken, status: "hidden" }); return; }
      if (!valid()) return;
      const status = await notificationService.status(current);
      if (valid()) setState({ accountId, token: current.sessionToken, status: status === "disabled" ? "visible" : "hidden" });
    } catch { if (valid()) setState({ accountId, token: current.sessionToken, status: "hidden" }); }
  }, [accountId, token]);
  useFocusEffect(useCallback(() => {
    active.current = true; busy.current = false; setState(null); void refresh();
    return () => { active.current = false; revision.current++; };
  }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", value => { if (value === "active") void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const act = async (later: boolean) => {
    if (!accountId || !active.current || busy.current) return;
    busy.current = true;
    const request = ++revision.current, generation = currentSessionGeneration(), current = latestSession.current;
    const valid = () => active.current && request === revision.current && generation === currentSessionGeneration() && current.sessionToken === latestSession.current.sessionToken && notificationAccount(latestSession.current) === accountId;
    const guard = () => { if (!valid()) throw new Error("บัญชีเปลี่ยนแล้ว"); };
    setState({ accountId, token: current.sessionToken, status: "saving" });
    try {
      if (later) await dismissInvitation(accountId, guard);
      const result = later ? null : await notificationService.enable(current);
      if (valid()) setState({ accountId, token: current.sessionToken, status: !later && result === "disabled" ? "visible" : !later && ["error", "loading", "saving"].includes(result!) ? "error" : "hidden" });
    } catch { if (valid()) setState({ accountId, token: current.sessionToken, status: later ? "hidden" : "error" }); }
    finally { if (request === revision.current) busy.current = false; }
  };
  if (!accountId || !state || state.accountId !== accountId || state.token !== session.sessionToken || state.status === "hidden") return null;
  const saving = state.status === "saving";
  return <View style={styles.card} testID="notification-invitation">
    <Text style={styles.title}>ไม่พลาดวันแข่งขัน</Text>
    <Text style={styles.description}>เปิดแจ้งเตือนบนอุปกรณ์นี้ เพื่อเตือนงานที่คุณสมัครและเข้าเกณฑ์ ก่อนวันงาน 1 วัน เวลา 09:00 น. (เวลาไทย)</Text>
    <View style={styles.actions}>
      <EventButton label={saving ? "กำลังบันทึก…" : "เปิดแจ้งเตือนการแข่งขัน"} disabled={saving} onPress={() => { void act(false); }} />
      <EventButton secondary label="ไว้ภายหลัง" disabled={saving} onPress={() => { void act(true); }} />
    </View>
    {state.status === "error" ? <Text accessibilityRole="alert" style={styles.problem}>ยังบันทึกไม่สำเร็จ กรุณาลองใหม่</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.sectionTitle, color: colors.gold },
  description: { ...typography.body, color: colors.muted },
  actions: { gap: spacing.xs },
  problem: { ...typography.body, color: colors.warning },
});
