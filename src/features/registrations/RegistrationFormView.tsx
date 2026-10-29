import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { EventDetail } from "@/types/events";
import { EventButton } from "@/features/events/EventControls";
import { eventDayLabel, parseCalendarInput } from "@/features/events/model";
import { colors, radius, spacing } from "@/design/tokens";
import { agreementsFor, automaticClass, classDescription, eligibleClasses, registrationAge, type FormFields } from "./model";
import { FormChoice, FormField, FormHeading, formStyles } from "./FormControls";
import { ThaiBirthdayPicker } from "./ThaiBirthdayPicker";
import { parseCompetitionClass } from "./competitionClasses";
import { validBirthday } from "./birthday";
import { photoTitles, type PhotoSlot } from "./photos";
export type RegistrationFormViewProps = {
  event: EventDetail; value: FormFields; agreements: Record<string, boolean>; photos: PhotoSlot[];
  onChange: (value: FormFields) => void; onAgreement: (key: string, checked: boolean) => void;
  onPhoto: (index: number, camera: boolean) => void; onRemovePhoto: (index: number) => void; onRetryPhoto: (index: number) => void;
  onLookup: () => void; lookupBusy: boolean; lookupMessage?: string | null;
  onSubmit: () => void; onEditRejected: () => void; onRefresh: () => void;
  busy: boolean; pending?: "sending" | "uncertain" | "rejected"; error?: string | null;
};
/** Real form presentation; controllers alone own sessions, picker and network effects. */
export function RegistrationFormView(props: RegistrationFormViewProps) {
  const { event, value, onChange, agreements, photos, pending, busy } = props;
  const locked = busy || !!pending;
  const mode = value.classMode ?? (parseCompetitionClass(value.type)?.kind === "special" ? "special" : "auto");
  const automatic = automaticClass(event, value);
  const classes = eligibleClasses(event, value).filter(label => mode === "manual" || parseCompetitionClass(label)?.kind === "special");
  let age: number | null = null;
  try { const birth = parseCalendarInput(value.birthdayInput).day; if (birth && validBirthday(birth) && value.color && value.sex) age = registrationAge(birth, event.ageCutoffDay, event.formKind === "royal", value.color); } catch { /* Invalid typed dates are validated on submit. */ }
  const field = (key: keyof FormFields, text: string) => onChange({ ...value, [key]: text });
  return <View>
    <Text style={formStyles.gold}>{event.formKind === "royal" ? "ROYAL COMPETITION" : "JAOTHUI COMPETITION"}</Text><Text style={formStyles.title}>ใบสมัครประกวด</Text><Text style={formStyles.body}>{event.name}</Text>
    <Text style={formStyles.hint}>วันแข่งขัน {eventDayLabel(event.competitionStartDay)} · ปิดรับสมัคร {eventDayLabel(event.registrationDeadline)}</Text>
    {event.policy.publicRegistration !== "open" ? <Text accessibilityRole="alert" style={formStyles.error}>กิจกรรมนี้ปิดรับสมัครแล้ว ข้อมูลที่กรอกยังอยู่{pending === "uncertain" ? " สามารถตรวจสอบคำขอเดิมได้" : ""}</Text> : null}
    <FormHeading title="เจ้าของและฟาร์ม" />
    <FormField label="ชื่อเจ้าของกระบือ" value={value.ownerName} disabled={locked} onChange={text => field("ownerName", text)} />
    <FormField label="โทรศัพท์เจ้าของ" value={value.ownerTel} disabled={locked} onChange={text => field("ownerTel", text)} keyboardType="phone-pad" />
    <FormField label="ชื่อฟาร์ม" value={value.farmName} disabled={locked} onChange={text => field("farmName", text)} />
    <FormField label="จังหวัด" value={value.province} disabled={locked} onChange={text => field("province", text)} />
    <FormHeading title="ข้อมูลกระบือ" subtitle="กรอกเองได้แม้ยังไม่มีไมโครชิป หากไม่ทราบชื่อพ่อหรือแม่ให้ระบุ ไม่ทราบ" />
    <FormField label="ไมโครชิป (ถ้ามี)" value={value.microchip} disabled={locked} onChange={text => field("microchip", text)} hint="ค้นหาข้อมูลได้ด้วยไมโครชิปตัวเลขอย่างน้อย 12 หลัก" />
    <EventButton secondary label={props.lookupBusy ? "กำลังค้นหากระบือ…" : "ค้นหาข้อมูลจากไมโครชิป"} disabled={locked || props.lookupBusy || !/^\d{12,}$/.test(value.microchip.trim())} onPress={props.onLookup} />
    {props.lookupMessage ? <Text accessibilityLiveRegion="polite" style={formStyles.hint}>{props.lookupMessage}</Text> : null}
    <FormField label="ชื่อกระบือ" value={value.name} disabled={locked} onChange={text => field("name", text)} />
    <Text style={formStyles.label}>เพศ</Text><View accessibilityRole="radiogroup" style={formStyles.choices}>{([['male', 'ผู้'], ['female', 'เมีย']] as const).map(([sex, label]) => <FormChoice key={sex} label={label} selected={value.sex === sex} disabled={locked} onPress={() => onChange({ ...value, sex })} />)}</View>
    <Text style={formStyles.label}>สี</Text><View accessibilityRole="radiogroup" style={formStyles.choices}>{([['black', 'ดำ'], ['albino', 'เผือก']] as const).map(([color, label]) => <FormChoice key={color} label={label} selected={value.color === color} disabled={locked} onPress={() => onChange({ ...value, color })} />)}</View>
    <ThaiBirthdayPicker value={value.birthdayInput} disabled={locked} onChange={text => field("birthdayInput", text)} />
    <Text style={formStyles.gold}>{age === null ? "กรอกวันเกิดและสีเพื่อดูอายุและรุ่นแข่งขัน" : `อายุประกวด ${age} เดือน · ตัดอายุ ${eventDayLabel(event.ageCutoffDay)}`}</Text>
    <Text style={formStyles.hint}>อายุและสิทธิ์รุ่นแข่งขันจะตรวจสอบอีกครั้งตามกติกาของงานก่อนบันทึก</Text>
    <FormHeading title="รุ่นแข่งขัน" subtitle="รุ่นปกติจัดตามอายุอัตโนมัติ รุ่นพิเศษต้องตรวจสอบคุณสมบัติเพิ่มเติมด้วยตนเอง" />
    <View style={formStyles.choices}><FormChoice label="รุ่นปกติอัตโนมัติ" selected={mode === "auto"} disabled={locked} onPress={() => onChange({ ...value, classMode: "auto", type: "" })} /><FormChoice label="เลือกรุ่นพิเศษ" selected={mode === "special"} disabled={locked} onPress={() => onChange({ ...value, classMode: "special", type: "" })} />{event.formKind === "royal" ? <FormChoice label="เลือกรุ่นเอง" selected={mode === "manual"} disabled={locked} onPress={() => onChange({ ...value, classMode: "manual", type: "" })} /> : null}</View>
    {mode === "auto" ? <Text style={formStyles.gold}>{automatic ? `ระดับ${automatic.level} · ${automatic.type}` : "ยังไม่มีรุ่นปกติที่ตรงกับข้อมูล กรุณาตรวจสอบวันเกิด เพศ สี หรือเลือกรุ่นพิเศษตามคุณสมบัติ"}</Text> : <>
      <View accessibilityRole="radiogroup" style={formStyles.choices}>{(["จังหวัด", "ประเทศ"] as const).map(level => <FormChoice key={level} label={`ระดับ${level}`} selected={value.level === level} disabled={locked || !event.catalogs.some(c => c.level === level)} onPress={() => onChange({ ...value, level, type: "" })} />)}</View>
      <View accessibilityRole="radiogroup" style={styles.classChoices}>{classes.map(label => <View key={label}><FormChoice label={label} selected={value.type === label} disabled={locked} onPress={() => field("type", label)} />{classDescription(event, value, label) ? <Text style={formStyles.hint}>{classDescription(event, value, label)}</Text> : null}</View>)}</View>
      {!classes.length ? <Text style={formStyles.hint}>ยังไม่มีรุ่นที่เลือกได้ กรุณาตรวจสอบวันเกิด เพศ สี ระดับ และกติกาของงาน</Text> : null}
    </>}
    <FormField label="ชื่อพ่อพันธุ์" value={value.fatherName} disabled={locked} onChange={text => field("fatherName", text)} />
    <FormField label="ชื่อแม่พันธุ์" value={value.motherName} disabled={locked} onChange={text => field("motherName", text)} />
    {event.formKind === "royal" ? <>
      <FormHeading title="ที่อยู่ติดต่อ" />
      <FormField label="ที่อยู่" value={value.address} disabled={locked} multiline onChange={text => field("address", text)} />
      <FormField label="ตำบล / แขวง" value={value.district} disabled={locked} onChange={text => field("district", text)} />
      <FormField label="อำเภอ / เขต" value={value.amphoe} disabled={locked} onChange={text => field("amphoe", text)} />
      <FormField label="รหัสไปรษณีย์" value={value.zipcode} disabled={locked} keyboardType="number-pad" maxLength={5} onChange={text => field("zipcode", text)} />
      <FormHeading title="ภาพประกอบ 5 ภาพ" subtitle="ภาพแต่ละช่องต้องต่างกัน แอปจะเตรียมเป็น JPEG ไม่เกิน 4 MiB ต่อภาพ" />
      {photoTitles.map((title, index) => <View key={title} style={styles.photoSlot}>
        <Text style={formStyles.label}>{index + 1}. {title}</Text>
        {photos[index].uri ? <Image source={{ uri: photos[index].uri }} accessibilityLabel={title} style={styles.photo} resizeMode="contain" /> : <View style={styles.emptyPhoto}><Text style={formStyles.hint}>ยังไม่มีภาพ</Text></View>}
        <Text style={photos[index].status === "ready" ? formStyles.gold : formStyles.hint}>{photos[index].status === "ready" ? "อัปโหลดแล้ว" : photos[index].status === "preparing" ? "กำลังเตรียมภาพ…" : photos[index].status === "uploading" ? "กำลังอัปโหลด…" : ""}</Text>
        {photos[index].error ? <Text accessibilityRole="alert" style={formStyles.error}>{photos[index].error}</Text> : null}
        <View style={formStyles.choices}><EventButton secondary label={`${photos[index].uri ? "เปลี่ยนภาพ" : "เลือกภาพ"} ${index + 1}`} disabled={locked || ["preparing", "uploading"].includes(photos[index].status)} onPress={() => props.onPhoto(index, false)} /><EventButton secondary label={`ถ่ายภาพ ${index + 1}`} disabled={locked || ["preparing", "uploading"].includes(photos[index].status)} onPress={() => props.onPhoto(index, true)} /></View>
        {photos[index].uri ? <View style={formStyles.choices}>{photos[index].status === "error" ? <EventButton label={`ลองอัปโหลดภาพ ${index + 1} ใหม่`} disabled={locked} onPress={() => props.onRetryPhoto(index)} /> : null}<EventButton secondary label={`ลบภาพ ${index + 1}`} disabled={locked} onPress={() => props.onRemovePhoto(index)} /></View> : null}
      </View>)}
    </> : null}
    <FormHeading title="เงื่อนไขข้อตกลง" subtitle="โปรดอ่านทุกข้อและเลือกยินยอมด้วยตนเอง" />
    {agreementsFor(event).map(clause => <View key={clause.key} style={styles.clause}><Text style={formStyles.body}>{clause.text}</Text><Pressable accessibilityRole="checkbox" accessibilityLabel={`ยินยอม: ${clause.text}`} accessibilityState={{ checked: agreements[clause.key] === true, disabled: locked }} disabled={locked} onPress={() => props.onAgreement(clause.key, !agreements[clause.key])} style={styles.checkbox}><Text style={formStyles.gold}>{agreements[clause.key] ? "☑ ยินยอม" : "☐ ยินยอม"}</Text></Pressable></View>)}
    {props.error ? <Text accessibilityRole="alert" style={formStyles.error}>{props.error}</Text> : null}
    {pending === "uncertain" ? <Text style={formStyles.body}>ยังตรวจสอบผลการส่งไม่ได้ ข้อมูลถูกเก็บไว้สำหรับตรวจสอบคำขอเดิม กรุณาอย่าสมัครซ้ำ</Text> : null}
    <View style={formStyles.actions}>{pending === "rejected" ? <EventButton label="แก้ไขข้อมูลตามกติกาปัจจุบัน" onPress={props.onEditRejected} disabled={busy} /> : <EventButton label={busy ? "กำลังส่งใบสมัคร…" : pending === "uncertain" ? "ตรวจสอบคำขอเดิมอีกครั้ง" : "ยืนยันส่งใบสมัคร"} onPress={props.onSubmit} disabled={busy || (event.policy.publicRegistration !== "open" && pending !== "uncertain")} />}<EventButton secondary label="ตรวจสอบกติกาล่าสุด" onPress={props.onRefresh} disabled={busy} /></View>
  </View>;
}
const styles = StyleSheet.create({ classChoices: { gap: spacing.sm }, clause: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: spacing.sm }, checkbox: { minHeight: spacing.touchTarget, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface }, photoSlot: { gap: spacing.xs, paddingBottom: spacing.xl }, photo: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surface, borderRadius: radius.photo }, emptyPhoto: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surface, borderRadius: radius.photo, alignItems: "center", justifyContent: "center" } });
