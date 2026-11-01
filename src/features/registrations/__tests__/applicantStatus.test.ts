import { applicantStatus, applicantStatusLabels, arrivalLabel, applicantLevel, applicantTime, canOpenApplicantPass } from "../applicantStatus";
import { historyStatusLabel, registrationActive } from "../model";
import { registration } from "./fixtures";
it("uses source policy rather than legacy approval/unknown-type guesses", () => {
  expect(applicantStatus({ ...registration, status: "rejected", registrationStatus: "registered" })).toBe("registered");
  expect(applicantStatus({ ...registration, event: { ...registration.event, eventType: null }, status: "registered" })).toBe("needs_type_review");
  expect(applicantStatus({ ...registration, event: { ...registration.event, eventType: "royal" }, status: "approved" })).toBe("accepted");
  expect(applicantStatusLabels.needs_type_review).toBe("ต้องตรวจประเภทงาน");
});
it("separates signup, event period and arrival, including final Bangkok day", () => {
  const row = { ...registration, event: { ...registration.event, endDay: "2026-11-01" }, checkInVersion: 1 as const, checkInStatus: "checked_in" as const, checkedInAt: "2026-11-01T01:00:00Z" };
  expect(registrationActive(row, new Date("2026-11-01T16:59:59Z"))).toBe(true);
  expect(registrationActive(row, new Date("2026-11-01T17:00:00Z"))).toBe(false);
  expect(historyStatusLabel(registration)).toBe("สมัครสำเร็จ");
  expect(arrivalLabel(row)).toBe("รายงานตัวแล้ว");
  expect(arrivalLabel({ ...row, checkInStatus: "not_checked_in" })).toBe("ยังไม่รายงานตัว");
  expect(arrivalLabel(registration)).toContain("ยังไม่มีข้อมูล");
  expect(applicantTime(row.checkedInAt)).toContain("08:00");
  expect(applicantTime("invalid")).toBe("ไม่พบเวลาที่บันทึก");
});
it("keeps before-start QR distinct from arrival eligibility and individual class status", () => {
  const a = { ...registration, qrAvailable: true, checkInEligibility: { eligible: false, reason: "ยังไม่ถึงวันเปิดรายงานตัว" } };
  const b = { ...registration, id: "other-class", qrAvailable: false, checkInVersion: 1 as const, checkInStatus: "not_checked_in" as const };
  expect(canOpenApplicantPass(a)).toBe(true); expect(canOpenApplicantPass(b)).toBe(false);
  expect(canOpenApplicantPass({ ...b, checkInStatus: "checked_in" })).toBe(true);
  expect(applicantLevel("ประเทศ")).toBe("รุ่นแข่งขัน"); expect(applicantLevel("province")).toBe("รุ่นจังหวัด");
});
