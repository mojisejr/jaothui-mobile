const THAI_MONTHS_ABBREVIATED = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export function formatBuffaloAge(months: number | null | undefined): string {
  const value = typeof months === "number" && Number.isFinite(months) ? Math.floor(months) : 0;
  if (value < 1) return "น้อยกว่าหนึ่งเดือน";
  return `${value} เดือน`;
}

export function formatThaiBirthdate(epochMs: number | null | undefined): string {
  if (typeof epochMs !== "number" || !Number.isFinite(epochMs) || epochMs <= 0) return "N/A";

  const bangkokDate = new Date(epochMs + BANGKOK_OFFSET_MS);
  const date = bangkokDate.getUTCDate();
  const month = THAI_MONTHS_ABBREVIATED[bangkokDate.getUTCMonth()] ?? "N/A";
  const year = bangkokDate.getUTCFullYear() + 543;

  return `${date} ${month} ${year}`;
}
