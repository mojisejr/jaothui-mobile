import { parseCalendarInput } from "@/features/events/model";
export const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
export const bangkokToday = (now = new Date()) => new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
export function validBirthday(day: string, now = new Date()) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= "1900-01-01" && day <= bangkokToday(now) && parseCalendarInput(calendarInputFromDay(day)).day === day;
}
export const calendarInputFromDay = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}/${Number(day.slice(0, 4)) + 543}`;
export function birthdayParts(value: string): string[] {
  const iso = parseCalendarInput(value).day;
  return (iso ? calendarInputFromDay(iso) : value).split("/").concat(["", "", ""]).slice(0, 3);
}
export function birthdayDays(month: string, year: string) {
  if (!month) return 31;
  return new Date(Date.UTC(year ? Number(year) - 543 : 2000, Number(month), 0)).getUTCDate();
}
/** Partial selections stay in the draft, but never parse as a submitted birthday. */
export function changeBirthdayPart(value: string, index: number, choice: string) {
  const parts = birthdayParts(value); parts[index] = choice;
  if (Number(parts[0]) > birthdayDays(parts[1], parts[2])) parts[0] = "";
  return parts.join("/");
}
