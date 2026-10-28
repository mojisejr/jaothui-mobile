import { Text, View } from "react-native";
import { EventButton } from "@/features/events/EventControls";
import type { MemberEnrollment } from "@/types/events";
import { FormField, FormHeading, formStyles } from "./FormControls";
export function MemberFormView({ value, onChange, onSubmit, busy, error }: { value: MemberEnrollment; onChange: (value: MemberEnrollment) => void; onSubmit: () => void; busy: boolean; error?: string | null }) {
  return <View><FormHeading title="สมาชิกกิจกรรมประกวด" subtitle="ใช้สมาชิกชุดเดียวกับระบบประกวด โดยไม่ต้องเชื่อมกระเป๋าเงิน" /><Text style={formStyles.body}>ชื่อที่กรอกจะช่วยเติมชื่อเจ้าของในใบสมัครครั้งนี้ ข้อมูลสมาชิกกิจกรรมเก็บเบอร์โทรศัพท์และอีเมล</Text>
    <FormHeading title="ข้อมูลติดต่อ" />
    <FormField label="ชื่อ" value={value.firstName} disabled={busy} onChange={firstName => onChange({ ...value, firstName })} />
    <FormField label="นามสกุล" value={value.lastName} disabled={busy} onChange={lastName => onChange({ ...value, lastName })} />
    <FormField label="เบอร์โทรศัพท์" value={value.tel} disabled={busy} keyboardType="phone-pad" onChange={tel => onChange({ ...value, tel })} />
    <FormField label="อีเมล (ไม่บังคับ)" value={value.email ?? ""} disabled={busy} keyboardType="email-address" maxLength={254} onChange={email => onChange({ ...value, email })} />
    {error ? <Text accessibilityRole="alert" style={formStyles.error}>{error}</Text> : null}
    <View style={formStyles.actions}><EventButton label={busy ? "กำลังบันทึก…" : "บันทึกสมาชิกและกรอกใบสมัคร"} disabled={busy} onPress={onSubmit} /></View>
  </View>;
}
