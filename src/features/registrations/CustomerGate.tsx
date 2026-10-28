import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { Text, View } from "react-native";
import { MobileApiError } from "@/api/client";
import { openEventLineLink, openProfileLineLink } from "@/auth/eventLineLink";
import { StateBlock } from "@/components/StateBlock";
import { EventButton } from "@/features/events/EventControls";
import { eventAccountError } from "./customer";
import { formStyles } from "./FormControls";
export function CustomerGate({ error, retry, eventId }: { error: unknown; retry: () => void; eventId?: string }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [problem, setProblem] = useState<string | null>(null);
  const link = error instanceof MobileApiError && error.code === "LINE_LINK_REQUIRED";
  const auth = error instanceof MobileApiError && ["CUSTOMER_REQUIRED", "INVALID_SESSION"].includes(error.code);
  const connect = async () => {
    setBusy(true); setProblem(null);
    try { const result = eventId ? await openEventLineLink(eventId) : await openProfileLineLink(); if (result.ok) router.replace(result.target as Href); }
    catch (failure) { setProblem(eventAccountError(failure)); }
    finally { setBusy(false); }
  };
  return <View><StateBlock title={link ? "เชื่อม LINE กับบัญชีนี้ก่อน" : "ยังเปิดข้อมูลนี้ไม่ได้"} message={eventAccountError(error)} actionLabel="ลองใหม่" onAction={retry} />
    {link ? <View style={formStyles.actions}><Text style={formStyles.body}>เชื่อมกับบัญชี JAOTHUI ปัจจุบัน บัญชี Apple และกระเป๋าเงินเดิมยังอยู่</Text><EventButton label={busy ? "กำลังเชื่อมต่อ…" : "เชื่อม LINE กับบัญชีนี้"} disabled={busy} onPress={() => { void connect(); }} /></View> : null}
    {auth ? <View style={formStyles.actions}><EventButton label="ไปโปรไฟล์เพื่อเข้าสู่ระบบ" onPress={() => router.push("/profile")} /></View> : null}
    {problem ? <Text accessibilityRole="alert" style={formStyles.error}>{problem}</Text> : null}
  </View>;
}
