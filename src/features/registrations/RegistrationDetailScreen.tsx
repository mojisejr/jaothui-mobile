import { useCallback, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { MobileApiError } from "@/api/client";
import { getEventRegistration } from "@/api/events";
import { validEventId } from "@/auth/oauthIntentStorage";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { EventButton } from "@/features/events/EventControls";
import { eventPrivateRequest } from "./privateRequest";
import { useRegistrationResource } from "./useRegistrationResource";
import { RegistrationDetailView } from "./RegistrationDetailView";
import { ApplicantQrPanel } from "./ApplicantQrPanel";
import { applicantTime, canOpenApplicantPass } from "./applicantStatus";
import { CustomerGate } from "./CustomerGate";
import { formStyles } from "./FormControls";
export function RegistrationDetailScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ id: string }>(), id = typeof params.id === "string" ? params.id : "";
  const [showQr, setShowQr] = useState(false);
  useFocusEffect(useCallback(() => () => setShowQr(false), []));
  const loader = useCallback(() => eventPrivateRequest(session => {
    if (!validEventId(id)) throw new MobileApiError("ไม่พบใบสมัคร", "REGISTRATION_NOT_FOUND", 404);
    return getEventRegistration(session.sessionToken, id);
  }), [id]), resource = useRegistrationResource(loader, 30000);
  const registration = resource.data?.value;
  return <Screen activeTab="profile" onRefresh={() => { void resource.reload(); }} refreshing={resource.refreshing}><Pressable accessibilityRole="button" onPress={() => router.replace("/registrations")} style={formStyles.back}><Text style={formStyles.gold}>← ประวัติการสมัคร</Text></Pressable>
    {resource.status === "loading" ? <Skeleton variant="card" /> : resource.status === "error" ? resource.error instanceof MobileApiError && resource.error.status === 404 ? <StateBlock title="ไม่พบใบสมัครนี้" message="ใบสมัครอาจไม่พร้อมใช้งานหรือไม่ได้อยู่ในบัญชีนี้" actionLabel="กลับประวัติการสมัคร" onAction={() => router.replace("/registrations")} /> : <CustomerGate error={resource.error!} retry={() => { void resource.reload(); }} /> : registration ? <>
      {resource.error ? <Text accessibilityRole="alert" style={formStyles.error}>โหลดข้อมูลล่าสุดไม่สำเร็จ สถานะที่แสดงอาจยังไม่เป็นปัจจุบัน กรุณาเชื่อมต่อแล้วลองใหม่</Text> : null}
      <Text style={formStyles.hint}>ข้อมูลล่าสุด {applicantTime(resource.updatedAt)} (เวลาไทย)</Text><EventButton secondary label={resource.refreshing ? "กำลังโหลด…" : "โหลดข้อมูลล่าสุด"} disabled={resource.refreshing} onPress={() => { void resource.reload(); }} />
      <RegistrationDetailView registration={registration} />{canOpenApplicantPass(registration) ? <EventButton label={registration.checkInStatus === "checked_in" ? "ดูการรายงานตัว" : "แสดง QR รายงานตัว"} onPress={() => setShowQr(true)} /> : null}
      {showQr ? <ApplicantQrPanel key={registration.id} application={registration} onClose={() => setShowQr(false)} onUpdated={() => { void resource.reload(); }} /> : null}
    </> : null}
  </Screen>;
}
