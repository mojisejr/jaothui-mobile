import { useCallback, useEffect, useRef } from "react";
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { MobileApiError } from "@/api/client";
import { getEventRegistration, getEventRegistrationPass } from "@/api/events";
import { colors, radius, spacing } from "@/design/tokens";
import type { RegistrationSummary } from "@/types/events";
import { EventButton } from "@/features/events/EventControls";
import { CustomerGate } from "./CustomerGate";
import { formStyles } from "./FormControls";
import { eventPrivateRequest } from "./privateRequest";
import { useRegistrationResource } from "./useRegistrationResource";
import { applicantLevel, applicantStatus, applicantStatusLabels, applicantTime, arrivalLabel } from "./applicantStatus";

export function ApplicantQrPanel({ application, onClose, onUpdated }: { application: RegistrationSummary; onClose: () => void; onUpdated: () => void }) {
  const { width } = useWindowDimensions();
  const qrAvailable = useRef(application.qrAvailable === true);
  const loader = useCallback(() => eventPrivateRequest(async session => {
    const pass = () => getEventRegistrationPass(session.sessionToken, application.id);
    if (qrAvailable.current) {
      try { return await pass(); }
      catch (error) { if (!(error instanceof MobileApiError && error.status === 403)) throw error; }
    }
    const registration = await getEventRegistration(session.sessionToken, application.id);
    qrAvailable.current = registration.qrAvailable === true;
    return registration.qrAvailable ? pass() : { registration, qrUrl: "" };
  }), [application.id]);
  const resource = useRegistrationResource(loader, 10000);
  const entry = resource.data?.value.registration;
  const qrUrl = !resource.error && resource.data?.value.qrUrl;
  const signature = useRef(JSON.stringify([application.registrationStatus, application.checkInStatus, application.checkedInAt]));
  const onUpdatedRef = useRef(onUpdated); onUpdatedRef.current = onUpdated;
  useEffect(() => {
    if (!entry) return;
    qrAvailable.current = entry.qrAvailable === true;
    const next = JSON.stringify([entry.registrationStatus, entry.checkInStatus, entry.checkedInAt]);
    if (next !== signature.current) { signature.current = next; onUpdatedRef.current(); }
  }, [entry]);
  const validUrl = typeof qrUrl === "string" && qrUrl.startsWith("https://") && qrUrl.length <= 4096;
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <EventButton secondary label="ปิด QR รายงานตัว" onPress={onClose} />
        <Text accessibilityRole="header" style={formStyles.title}>QR รายงานตัว</Text>
        {entry ? <>
          <Text style={formStyles.section}>{entry.buffalo.name}</Text><Text style={formStyles.body}>{entry.event.name}</Text>
          <Text style={formStyles.gold}>{applicantLevel(entry.buffalo.level)} · {entry.buffalo.type}</Text>
          <Text style={formStyles.body}>ไมโครชิป: {entry.buffalo.microchip || "ไม่ได้ระบุ"}</Text>
          <Text style={formStyles.hint}>QR นี้ใช้สำหรับใบสมัครและรุ่นนี้เท่านั้น ให้เจ้าหน้าที่สแกน ตรวจข้อมูล และยืนยันรายงานตัว</Text>
          {validUrl && entry.qrAvailable ? <View accessible accessibilityLabel={`QR รายงานตัว ${entry.buffalo.name} ${entry.buffalo.type}`} style={styles.qr}>
            <QRCode value={qrUrl} size={Math.max(80, Math.min(width - 96, 256))} quietZone={24} color={colors.qrForeground} backgroundColor={colors.qrBackground} ecl="M" />
          </View> : null}
          <Text style={formStyles.body}>ใบสมัคร: {applicantStatusLabels[applicantStatus(entry)]}</Text>
          <Text accessibilityLiveRegion="polite" style={formStyles.section}>{arrivalLabel(entry)}</Text>
          {entry.checkedInAt ? <Text style={formStyles.body}>{applicantTime(entry.checkedInAt)} (เวลาไทย)</Text> : null}
          {entry.checkInEligibility?.reason ? <Text style={formStyles.hint}>{entry.checkInEligibility.reason}</Text> : null}
        </> : null}
        {resource.error ? resource.data ? <Text accessibilityRole="alert" style={formStyles.error}>โหลดข้อมูลล่าสุดไม่สำเร็จ สถานะที่แสดงอาจยังไม่เป็นปัจจุบัน กรุณาเชื่อมต่อแล้วลองใหม่</Text> : <CustomerGate error={resource.error} retry={() => { void resource.reload(); }} /> : null}
        {!entry && !resource.error ? <Text style={formStyles.body}>กำลังโหลด QR และข้อมูลล่าสุด…</Text> : null}
        {entry ? <><Text style={formStyles.hint}>ข้อมูลล่าสุด {applicantTime(resource.updatedAt)} (เวลาไทย)</Text><EventButton secondary label={resource.refreshing ? "กำลังโหลด…" : "โหลดข้อมูลล่าสุด"} disabled={resource.refreshing} onPress={() => { void resource.reload(); }} /></> : null}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.screenX, gap: spacing.md }, qr: { alignSelf: "center", backgroundColor: colors.qrBackground, borderRadius: radius.sm, overflow: "hidden" } });
