import type { EventSummary } from "@/types/events";

export function homeEventItems(items: EventSummary[]) { return items.filter(item => item.publicRegistration === "open").slice(0, 5); }
export function stableEventIndex(items: EventSummary[], selectedId: string | null, oldIndex = 0) {
  const found = selectedId ? items.findIndex(item => item.id === selectedId) : -1;
  return found >= 0 ? found : Math.max(0, Math.min(oldIndex, items.length - 1));
}
export function shouldAutoplay(input: { count: number; visible: boolean; active: boolean; interacting: boolean; paused: boolean; reduceMotion: boolean | null; screenReader: boolean | null }) {
  return input.count > 1 && input.visible && input.active && !input.interacting && !input.paused && input.reduceMotion === false && input.screenReader === false;
}
export function parseCalendarInput(value: string): { day?: string; error?: string } {
  if (!value.trim()) return {};
  const digits = value.replace(/[๐-๙]/g, digit => String("๐๑๒๓๔๕๖๗๘๙".indexOf(digit)));
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(digits);
  if (!match) return { error: "กรอกวันที่เป็น วว/ดด/ปปปป เช่น 29/10/2569" };
  const year = Number(match[3]) > 2399 ? Number(match[3]) - 543 : Number(match[3]);
  const iso = `${year}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (year < 1900 || year > 2300 || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return { error: "วันที่นี้ไม่มีในปฏิทิน กรุณาตรวจสอบอีกครั้ง" };
  return { day: iso };
}
export function formatCalendarInput(value: string) {
  const digits = value.replace(/[๐-๙]/g, digit => String("๐๑๒๓๔๕๖๗๘๙".indexOf(digit))).replace(/\D/g, "").slice(0, 8);
  return digits.slice(0, 2) + (digits.length > 2 ? `/${digits.slice(2, 4)}` : "") + (digits.length > 4 ? `/${digits.slice(4)}` : "");
}
export function eventDayLabel(day: string | null) {
  if (!day) return "รอประกาศวันที่";
  const date = new Date(`${day}T00:00:00+07:00`);
  if (!Number.isFinite(date.getTime())) return "รอประกาศวันที่";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
}
export function createLatestRequestGate() {
  let version = 0;
  return { start: () => ++version, current: (candidate: number) => candidate === version, invalidate: () => { version++; } };
}

/** Read dimensions embedded in trusted Sanity asset URLs; no image requests or layout jumps. */
export function posterAspectRatio(url: string | null): number {
  if (!url) return 4 / 5;
  try {
    const source = new URL(url);
    if (source.hostname !== "cdn.sanity.io" || !source.pathname.startsWith("/images/")) return 4 / 5;
    const match = /-(\d+)x(\d+)\.[a-z]+$/i.exec(source.pathname);
    if (!match) return 4 / 5;
    const width = Number(match[1]), height = Number(match[2]);
    return width > 0 && height > 0 && width <= 100000 && height <= 100000 ? width / height : 4 / 5;
  } catch { return 4 / 5; }
}
