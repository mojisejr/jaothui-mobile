import type { EventDetail, MemberEnrollment, RegistrationRequest, RegistrationStatus } from "@/types/events";
import { parseCalendarInput } from "@/features/events/model";
import { classDisplayName, getEligibleCompetitionClasses, normalizeClassName, parseCompetitionClass } from "./competitionClasses";
import { validBirthday } from "./birthday";
import { getAmphoeFromProvince, getDistrictsFromAmphoe } from "./addressHelper";
import { eventAgreements } from "./agreements";

export type FormFields = {
  firstName: string; lastName: string; ownerName: string; ownerTel: string; province: string; farmName: string; name: string; microchip: string;
  sex: "" | "male" | "female"; color: "" | "black" | "albino"; birthdayInput: string;
  classMode?: "auto" | "special" | "manual";
  fatherName: string; motherName: string; level: "จังหวัด" | "ประเทศ"; type: string;
  address: string; district: string; amphoe: string; zipcode: string;
};
export const emptyFields = (): FormFields => ({ firstName: "", lastName: "", ownerName: "", ownerTel: "", province: "", farmName: "", name: "", microchip: "", sex: "", color: "", birthdayInput: "", fatherName: "", motherName: "", level: "จังหวัด", type: "", address: "", district: "", amphoe: "", zipcode: "" });
export function migrateOwnerFields(fields: FormFields): FormFields {
  if (fields.firstName !== undefined && fields.lastName !== undefined) return fields;
  const [firstName = "", ...rest] = (fields.ownerName || "").trim().split(/\s+/);
  return { ...fields, firstName, lastName: rest.join(" ") };
}
export const thaiDigits = (text: string) => text.replace(/[๐-๙]/g, d => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d)));
export function normalizePhone(text: string): string | null {
  let phone = thaiDigits(text).replace(/[\s()-]/g, "");
  if (phone.startsWith("+66")) phone = "0" + phone.slice(3);
  else if (phone.startsWith("0066")) phone = "0" + phone.slice(4);
  return /^0[1-9]\d{7,8}$/.test(phone) ? phone : null;
}
export function validateMember(fields: MemberEnrollment): { value?: MemberEnrollment; error?: string } {
  if (![fields.firstName, fields.lastName].every(v => v.trim() && v.length <= 300)) return { error: "กรุณากรอกชื่อและนามสกุล" };
  const tel = normalizePhone(fields.tel);
  if (!tel) return { error: "กรุณากรอกเบอร์โทรศัพท์ไทยให้ครบ เช่น 0812345678" };
  const email = fields.email?.trim();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: "กรุณาตรวจสอบอีเมล หรือเว้นว่างไว้" };
  return { value: { firstName: fields.firstName, lastName: fields.lastName, tel, email: email || null } };
}
function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
/** Source calendar-month ceiling, including clamped end-of-month anniversaries. */
export function registrationAge(birth: string, cutoff: string | null, royal: boolean, color: string): number {
  if (!validDay(birth) || !cutoff || !validDay(cutoff)) throw new Error("วันเกิดหรือวันตัดอายุไม่ถูกต้อง");
  if (royal && color !== "black") birth = new Date(Date.parse(`${birth}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  if (birth > cutoff) throw new Error("วันเกิดต้องไม่เกินวันตัดอายุ");
  const [by, bm, bd] = birth.split("-").map(Number), [ey, em] = cutoff.split("-").map(Number);
  const anniversary = (months: number) => {
    const month = bm - 1 + months, year = by + Math.floor(month / 12), normalized = month % 12;
    const day = Math.min(bd, new Date(Date.UTC(year, normalized + 1, 0)).getUTCDate());
    return new Date(Date.UTC(year, normalized, day)).toISOString().slice(0, 10);
  };
  let months = (ey - by) * 12 + em - bm;
  if (anniversary(months) > cutoff) months--;
  return months + (anniversary(months) < cutoff ? 1 : 0);
}
export function eligibleClasses(event: EventDetail, fields: FormFields) {
  const birth = parseCalendarInput(fields.birthdayInput).day;
  if (!birth || !validBirthday(birth) || !fields.color) return [];
  try {
    const age = registrationAge(birth, event.ageCutoffDay, event.formKind === "royal", fields.color);
    return getEligibleCompetitionClasses(age, event.catalogs.filter(c => c.level === fields.level).flatMap(c => c.labels));
  } catch { return []; }
}
/** Resolve rules from the catalog; a display name does not contain the encoded metadata. */
export function catalogClass(event: EventDetail, fields: Pick<FormFields, "level">, label: string) {
  const raw = event.catalogs.filter(c => c.level === fields.level).flatMap(c => c.labels).find(value => classDisplayName(value) === label);
  return raw ? parseCompetitionClass(raw) : null;
}
/** Match the web: province wins when normal age classes exist at both levels. */
export function automaticClass(event: EventDetail, fields: FormFields) {
  for (const level of ["จังหวัด", "ประเทศ"] as const) {
    const labels = eligibleClasses(event, { ...fields, level });
    const type = labels.find(label => catalogClass(event, { level }, label)?.kind === "age");
    if (type) return { level, type };
  }
  return null;
}
export function specialChoices(event: EventDetail, fields: FormFields) {
  return (["ประเทศ", "จังหวัด"] as const).flatMap(level => eligibleClasses(event, { ...fields, level })
    .filter(type => catalogClass(event, { level }, type)?.kind === "special").map(type => ({ level, type })));
}
export function reconcileClasses(event: EventDetail, fields: FormFields, previous?: FormFields): FormFields {
  // Web normal resets on chip/birthday; Royal recalculates only when its computed age changes.
  const age = (f: FormFields) => { try { return registrationAge(parseCalendarInput(f.birthdayInput).day!, event.ageCutoffDay, event.formKind === "royal", f.color); } catch { return null; } };
  const changed = previous && (event.formKind === "royal" ? age(fields) !== age(previous) : fields.microchip !== previous.microchip || fields.birthdayInput !== previous.birthdayInput);
  let classMode = changed || fields.classMode === "manual" ? "auto" : fields.classMode ?? (catalogClass(event, fields, fields.type)?.kind === "special" ? "special" : "auto");
  const specials = specialChoices(event, fields);
  if (classMode === "special") {
    const entering = previous?.classMode !== "special" && fields.type === "";
    const level = event.formKind === "normal" && entering && !specials.some(c => c.level === "จังหวัด") && specials.some(c => c.level === "ประเทศ") ? "ประเทศ" : fields.level;
    const type = specials.some(c => c.level === level && c.type === fields.type) ? fields.type : "";
    // Preserve explicit mode but discard any stale choice; all-age manual mode is obsolete.
    return { ...fields, classMode, level, type };
  }
  classMode = "auto";
  const match = automaticClass(event, fields);
  return { ...fields, classMode, level: match?.level ?? fields.level, type: match?.type ?? "" };
}
export function classDescription(event: EventDetail, fields: Pick<FormFields, "level">, label: string) {
  const parsed = catalogClass(event, fields, label);
  return parsed?.kind === "special" ? parsed.criteria || "รุ่นพิเศษ: กรุณาตรวจสอบคุณสมบัติตามกติกาของงาน" : null;
}
export function cutoffAgreement(day: string | null) {
  if (!day || !validDay(day)) return "วันที่ยังไม่ประกาศ";
  const date = new Date(`${day}T00:00:00+07:00`);
  const month = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(date);
  return `วันที่ ${Number(day.slice(8))} ${month}  พ.ศ. ​${Number(day.slice(0, 4)) + 543}`;
}
export function agreementsFor(event: EventDetail) {
  return eventAgreements[event.formKind].map(item => ({ key: item.key, text: item.text.replace("{cutoff}", cutoffAgreement(event.ageCutoffDay)) }));
}
export function buildRegistrationRequest(event: EventDetail, fields: FormFields, agreements: Record<string, boolean>, imageIds: string[], operationId: string, now = new Date()): RegistrationRequest {
  const ownerName = `${fields.firstName} ${fields.lastName}`;
  if (![fields.firstName, fields.lastName].every(v => v?.trim()) || ownerName.length > 300) throw new Error("กรุณากรอกชื่อและนามสกุลเจ้าของกระบือ");
  const required = [ownerName, fields.province, fields.farmName, fields.name, fields.fatherName, fields.motherName];
  if (required.some(v => !v.trim() || v.length > 300) || fields.microchip.length > 300) throw new Error("กรุณากรอกข้อมูลเจ้าของ ฟาร์ม จังหวัด และข้อมูลกระบือให้ครบ (ไม่ทราบพ่อหรือแม่ให้ระบุ ไม่ทราบ)");
  const ownerTel = normalizePhone(fields.ownerTel);
  if (!ownerTel) throw new Error("กรุณากรอกเบอร์โทรศัพท์ไทยให้ครบ เช่น 0812345678");
  const birthday = parseCalendarInput(fields.birthdayInput);
  if (!birthday.day || birthday.error) throw new Error(birthday.error ?? "กรุณากรอกวันเกิดกระบือ");
  if (birthday.day > new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10)) throw new Error("วันเกิดกระบือต้องไม่อยู่ในอนาคต");
  if (!fields.sex || !fields.color) throw new Error("กรุณาเลือกเพศและสีกระบือ");
  const buffaloAge = registrationAge(birthday.day, event.ageCutoffDay, event.formKind === "royal", fields.color);
  if (buffaloAge > 1200 || !eligibleClasses(event, fields).includes(fields.type)) throw new Error("กรุณาเลือกรุ่นแข่งขันที่ตรงกับอายุและกติกาปัจจุบันของงาน");
  const clauses = agreementsFor(event);
  if (clauses.some(clause => agreements[clause.key] !== true)) throw new Error("กรุณาอ่านและยินยอมข้อตกลงทุกข้อก่อนส่งใบสมัคร");
  const payload: RegistrationRequest = { operationId, type: normalizeClassName(fields.type), level: fields.level, name: fields.name,
    sex: fields.sex, color: fields.color, birthdate: birthday.day, microchip: fields.microchip.trim() ? fields.microchip : fields.name, ownerName, ownerTel,
    fatherName: fields.fatherName, motherName: fields.motherName, farmName: fields.farmName, province: fields.province, buffaloAge,
    agreements: Object.fromEntries(clauses.map(clause => [clause.key, true as const])) };
  if (event.formKind === "royal") {
    if ([fields.address, fields.district, fields.amphoe].some(v => !v.trim() || v.length > 300) || !/^\d{5}$/.test(thaiDigits(fields.zipcode))) throw new Error("กรุณากรอกที่อยู่ ตำบล อำเภอ และรหัสไปรษณีย์ 5 หลักให้ครบ");
    if (!getAmphoeFromProvince(fields.province).includes(fields.amphoe) || !getDistrictsFromAmphoe(fields.province, fields.amphoe).includes(fields.district)) throw new Error("กรุณาเลือกจังหวัด อำเภอ และตำบลให้ตรงกัน");
    if (imageIds.length !== 5 || new Set(imageIds).size !== 5 || imageIds.some(id => !/^image-[a-f0-9]+-\d+x\d+-(jpeg|jpg|png|webp)$/.test(id))) throw new Error("กรุณาอัปโหลดภาพให้ครบ 5 ภาพที่แตกต่างกัน");
    Object.assign(payload, { address: fields.address, district: fields.district, amphoe: fields.amphoe, zipcode: thaiDigits(fields.zipcode), imageIds: [...imageIds] });
  }
  return payload;
}
export const registrationStatusLabel: Record<RegistrationStatus, string> = { registered: "สมัครสำเร็จ", pending: "รอพิจารณา", approved: "ผ่านการพิจารณา", rejected: "ไม่ผ่านการพิจารณา" };

export type HistoryPeriod = "active" | "past" | "all";
export function registrationActive(row: import("@/types/events").RegistrationSummary, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  return !!row.event.endDay && row.event.endDay.slice(0, 10) >= today;
}
export function historyStatusLabel(row: import("@/types/events").RegistrationSummary) {
  return row.status === "registered" && !registrationActive(row) ? "จบงานแล้ว" : registrationStatusLabel[row.status];
}
