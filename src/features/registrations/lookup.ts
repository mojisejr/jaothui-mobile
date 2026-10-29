import type { RegistrationLookup } from "@/types/events";
import type { FormFields } from "./model";
import { calendarInputFromDay, validBirthday } from "./birthday";
/** Registration blockchain DTO uses source epoch seconds; retain legacy draft compatibility. */
export function lookupBirthday(birthday: string | null, epoch: number | null): string {
  if (birthday && validBirthday(birthday)) return calendarInputFromDay(birthday);
  if (typeof epoch !== "number" || !Number.isFinite(epoch) || epoch <= 0) return "";
  const milliseconds = epoch < 100_000_000_000 ? epoch * 1000 : epoch;
  const date = new Date(milliseconds);
  if (!Number.isFinite(date.getTime())) return "";
  const day = date.toISOString().slice(0, 10);
  return validBirthday(day) ? calendarInputFromDay(day) : "";
}
/** A late lookup may fill only the exact field snapshot that requested it. */
export function createBuffaloLookup(deps: { fields: () => FormFields; read: (microchip: string) => Promise<RegistrationLookup>; current: () => Promise<boolean>; apply: (fields: FormFields) => void; state: (busy: boolean, message: string | null) => void }) {
  let generation = 0;
  return {
    cancel() { generation++; deps.state(false, null); },
    async lookup() {
      const before = { ...deps.fields() }, microchip = before.microchip.trim();
      if (!microchip || microchip.length > 300) return;
      const request = ++generation, snapshot = JSON.stringify(before); deps.state(true, null);
      try {
        const result = await deps.read(microchip);
        if (generation !== request || JSON.stringify(deps.fields()) !== snapshot || !await deps.current()) return;
        const b = result.buffalo, sex = b.sex?.trim().toLowerCase(), color = b.color?.trim().toLowerCase();
        const next: FormFields = { ...before, name: b.name || "", sex: sex === "male" || sex === "female" ? sex : "",
          color: color === "black" || color === "albino" ? color : "", birthdayInput: lookupBirthday(b.birthday, b.birthdate) };
        deps.apply(next); deps.state(false, "พบข้อมูลกระบือแล้ว กรุณาตรวจสอบก่อนส่งใบสมัคร");
      } catch (error) {
        if (generation === request && JSON.stringify(deps.fields()) === snapshot && await deps.current()) deps.state(false, (error as { status?: number }).status === 404 ? "ไม่พบข้อมูลไมโครชิปนี้ สามารถกรอกข้อมูลด้วยตนเองได้" : "ค้นหาข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่");
      } finally { if (generation === request) deps.state(false, null); }
    },
  };
}
