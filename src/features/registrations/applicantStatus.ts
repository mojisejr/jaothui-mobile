import type { ApplicantRegistrationStatus, RegistrationSummary } from "@/types/events";

export const applicantStatusLabels: Record<ApplicantRegistrationStatus, string> = {
  registered: "สมัครสำเร็จ", pending: "รอการอนุมัติ", accepted: "อนุมัติแล้ว",
  rejected: "ไม่ผ่านการอนุมัติ", needs_type_review: "ต้องตรวจประเภทงาน",
};
export function applicantStatus(row: RegistrationSummary): ApplicantRegistrationStatus {
  if (row.registrationStatus) return row.registrationStatus;
  // Older responses have no canonical policy, but unknown type is never success.
  if (!row.event.eventType) return "needs_type_review";
  return row.status === "approved" ? "accepted" : row.status;
}
export function applicantLevel(level: string) {
  return ["ประเทศ", "national"].includes(level) ? "รุ่นแข่งขัน" : ["จังหวัด", "province"].includes(level) ? "รุ่นจังหวัด" : level;
}
export function arrivalLabel(row: RegistrationSummary) {
  return row.checkInVersion !== 1 ? "ยังไม่มีข้อมูลรายงานตัวล่าสุด" : row.checkInStatus === "checked_in" ? "รายงานตัวแล้ว" : "ยังไม่รายงานตัว";
}
export function applicantTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "ไม่พบเวลาที่บันทึก";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function canOpenApplicantPass(row: RegistrationSummary) {
  return !row.statusRefreshPending && (row.qrAvailable === true || row.checkInStatus === "checked_in");
}
