/** Canonical source values only. Unknown data must never imply a sex. */
export function buffaloSex(value: unknown) {
  const canonical = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (canonical === "male") return { symbol: "♂", label: "ผู้", accessibleLabel: "เพศผู้" };
  if (canonical === "female") return { symbol: "♀", label: "เมีย", accessibleLabel: "เพศเมีย" };
  return { symbol: "", label: "ไม่ระบุ", accessibleLabel: "ไม่ระบุเพศ" };
}
