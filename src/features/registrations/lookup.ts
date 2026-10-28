import type { MobileCertDetail } from "@/types/mobile-api";
import type { FormFields } from "./model";
/** A late lookup may fill only the exact field snapshot that requested it. */
export function createBuffaloLookup(deps: { fields: () => FormFields; read: (microchip: string) => Promise<MobileCertDetail>; current: () => Promise<boolean>; apply: (fields: FormFields) => void; state: (busy: boolean, message: string | null) => void }) {
  let generation = 0;
  return {
    cancel() { generation++; deps.state(false, null); },
    async lookup() {
      const before = { ...deps.fields() }, microchip = before.microchip.trim();
      if (!/^\d{12,}$/.test(microchip)) return;
      const request = ++generation, snapshot = JSON.stringify(before); deps.state(true, null);
      try {
        const result = await deps.read(microchip);
        if (generation !== request || JSON.stringify(deps.fields()) !== snapshot || !await deps.current()) return;
        const b = result.buffalo, next = { ...before, name: b.name || before.name };
        if (b.sex === "male" || b.sex === "female") next.sex = b.sex;
        if (b.color === "black" || b.color === "albino") next.color = b.color;
        const birth = b.birthday?.slice(0, 10) ?? (b.birthdate && Number.isFinite(new Date(b.birthdate * 1000).getTime()) ? new Date(b.birthdate * 1000).toISOString().slice(0, 10) : null);
        if (birth && /^\d{4}-\d{2}-\d{2}$/.test(birth)) next.birthdayInput = `${birth.slice(8)}/${birth.slice(5, 7)}/${Number(birth.slice(0, 4)) + 543}`;
        deps.apply(next); deps.state(false, "พบข้อมูลกระบือแล้ว กรุณาตรวจสอบก่อนส่งใบสมัคร");
      } catch (error) {
        if (generation === request && JSON.stringify(deps.fields()) === snapshot && await deps.current()) deps.state(false, (error as { status?: number }).status === 404 ? "ไม่พบข้อมูลไมโครชิปนี้ สามารถกรอกข้อมูลด้วยตนเองได้" : "ค้นหาข้อมูลไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่");
      } finally { if (generation === request) deps.state(false, null); }
    },
  };
}
