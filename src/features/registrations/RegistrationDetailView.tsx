import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/design/tokens";
import type { RegistrationDetail } from "@/types/events";
import { eventDayLabel } from "@/features/events/model";
import { formStyles, FormHeading } from "./FormControls";
import { registrationStatusLabel } from "./model";
export function RegistrationDetailView({ registration, receipt = false, replayed = false }: { registration: RegistrationDetail; receipt?: boolean; replayed?: boolean }) {
  const r = registration;
  return <View><Text style={formStyles.gold}>{receipt ? "ได้รับใบสมัครแล้ว" : "ใบสมัครของฉัน"}</Text><Text style={formStyles.title}>{r.buffalo.name}</Text><Text style={formStyles.body}>{r.event.name}</Text><Text style={[styles.status, { color: r.status === "rejected" ? colors.danger : r.status === "pending" ? colors.warning : colors.success }]}>{registrationStatusLabel[r.status]}</Text>
    {receipt ? <Text style={formStyles.body}>{replayed ? "พบใบสมัครที่บันทึกไว้จากคำขอเดิมแล้ว ไม่มีการสมัครซ้ำ" : "บันทึกใบสมัครเรียบร้อยแล้ว"}</Text> : null}
    {r.status === "pending" ? <Text style={formStyles.hint}>ใบสมัคร Royal อยู่ระหว่างพิจารณา กรุณาติดตามผลในประวัติการสมัคร</Text> : null}
    {r.approvalComment ? <Text style={formStyles.body}>ความเห็นจากกองประกวด: {r.approvalComment}</Text> : null}
    <FormHeading title="ข้อมูลการแข่งขัน" /><Text style={formStyles.body}>วันแข่งขัน {eventDayLabel(r.event.startDay?.slice(0, 10) ?? null)}</Text><Text style={formStyles.body}>ระดับ{r.buffalo.level} · {r.buffalo.type}</Text><Text style={formStyles.body}>อายุประกวด {r.buffalo.age} เดือน</Text>
    <FormHeading title="ข้อมูลกระบือ" /><Text style={formStyles.body}>ไมโครชิป: {r.buffalo.microchip || "ไม่ได้ระบุ"}</Text><Text style={formStyles.body}>วันเกิด {eventDayLabel(r.buffalo.birthday?.slice(0, 10) ?? null)}</Text><Text style={formStyles.body}>เพศ {r.buffalo.sex === "male" ? "ผู้" : r.buffalo.sex === "female" ? "เมีย" : "ไม่ระบุ"} · สี {r.buffalo.color === "black" ? "ดำ" : r.buffalo.color === "albino" ? "เผือก" : "ไม่ระบุ"}</Text><Text style={formStyles.body}>พ่อ {r.fatherName} · แม่ {r.motherName}</Text>
    <FormHeading title="เจ้าของและข้อมูลติดต่อ" /><Text style={formStyles.body}>{r.ownerName}</Text><Text style={formStyles.body}>{r.ownerTel}</Text><Text style={formStyles.body}>{r.farmName} · {r.province}</Text>
    {r.address ? <><FormHeading title="ที่อยู่" /><Text style={formStyles.body}>{r.address.address} {r.address.district} {r.address.amphoe} {r.address.province} {r.address.zipcode}</Text></> : null}
    {r.images?.length ? <><FormHeading title="ภาพประกอบใบสมัคร" />{r.images.map((image, i) => <View key={`${i}-${image.imageTitle}`} style={styles.imageItem}><Text style={formStyles.body}>{image.imageTitle}</Text>{image.url ? <Image accessibilityLabel={image.imageTitle} source={{ uri: image.url }} resizeMode="contain" style={styles.image} /> : <Text style={formStyles.hint}>ไม่พบภาพนี้</Text>}</View>)}</> : null}
    <FormHeading title="เลขที่ใบสมัคร" /><Text selectable style={formStyles.hint}>{r.id}</Text>
  </View>;
}
const styles = StyleSheet.create({ status: { ...formStyles.section, marginVertical: spacing.md }, imageItem: { gap: spacing.xs, marginBottom: spacing.lg }, image: { width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surface, borderRadius: radius.photo } });
