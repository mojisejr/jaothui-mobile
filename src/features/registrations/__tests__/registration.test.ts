import { buildRegistrationRequest, validateMember, normalizePhone, registrationAge, eligibleClasses, agreementsFor } from "../model";
import { encodeCompetitionClass } from "../competitionClasses";
import { createSubmission } from "../submission";
import { createBuffaloLookup } from "../lookup";
import { MobileApiError } from "@/api/client";
import { normalEvent, royalEvent, filledFields, photoIds, registration } from "./fixtures";
import type { MobileCertDetail } from "@/types/mobile-api";
const consent = (royal = false) => Object.fromEntries(agreementsFor(royal ? royalEvent : normalEvent).map(c => [c.key, true]));
const uuid = "4a52ef5b-26bb-49b8-9ac0-cf06295a4902";
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
describe("source registration payload and consent", () => {
  it("builds normal source fields, preserves request strings, optional no-chip and exact4consents", () => {
    const fields = { ...filledFields, ownerName: "  ผู้สมัครทดสอบ  " };
    const request = buildRegistrationRequest(normalEvent, fields, consent(), [], uuid);
    expect(request).toMatchObject({ operationId: uuid, ownerName: fields.ownerName, ownerTel: "0812345678", birthdate: "2023-10-31", buffaloAge: 36, microchip: "", agreements: { accept1: true, accept2: true, accept3: true, accept4: true } });
    expect(Object.keys(request).sort()).toEqual(["operationId", "type", "level", "name", "sex", "color", "birthdate", "microchip", "ownerName", "ownerTel", "fatherName", "motherName", "farmName", "province", "buffaloAge", "agreements"].sort());
    expect(agreementsFor(normalEvent)[0].text).toBe("1. หากกระบือของท่านยังไม่มีการฝังไมโครชิป จะต้องดำเนินการฝังหน้างาน ตัวละ 500 บาท");
    expect(agreementsFor(normalEvent)[2].text).toContain("31 ตุลาคม");
  });
  it("requires all12Royalconsents including sourceaccept9 and5distinct images/address", () => {
    const request = buildRegistrationRequest(royalEvent, filledFields, consent(true), photoIds, uuid);
    expect(Object.keys(request.agreements)).toEqual(["d1Accept", "d2Accept", "d3Accept", ...Array.from({ length: 9 }, (_, i) => `accept${i + 1}`)]);
    expect(agreementsFor(royalEvent).at(-1)?.text).toBe("9. ผู้สมัครรับรองความถูกต้องของข้อมูลนี้ และให้มีผลสมบูรณ์ตามกฎหมายทุกประการ");
    for (const key of Object.keys(request.agreements)) expect(() => buildRegistrationRequest(royalEvent, filledFields, { ...consent(true), [key]: false }, photoIds, uuid)).toThrow("ข้อตกลง");
    expect(() => buildRegistrationRequest(royalEvent, filledFields, consent(true), Array(5).fill(photoIds[0]), uuid)).toThrow("5 ภาพ");
    expect(() => buildRegistrationRequest(royalEvent, { ...filledFields, address: "" }, consent(true), photoIds, uuid)).toThrow("ที่อยู่");
  });
  it("converts ThaiDOB/phones, validates calendar, future birth and requiredfields", () => {
    expect(normalizePhone("๐๘๑ ๒๓๔ ๕๖๗๘")).toBe("0812345678"); expect(normalizePhone("0066812345678")).toBe("0812345678"); expect(normalizePhone("812345678")).toBeNull();
    expect(validateMember({ firstName: "ชื่อ", lastName: "นามสกุล", tel: "+66812345678", email: "" }).value).toMatchObject({ tel: "0812345678", email: null });
    expect(validateMember({ firstName: "", lastName: "นามสกุล", tel: "0812345678" }).error).toBeTruthy();
    expect(validateMember({ firstName: "ชื่อ", lastName: "นามสกุล", tel: "0812345678", email: "invalid" }).error).toBeTruthy();
    for (const fields of [{ ...filledFields, birthdayInput: "31/02/2566" }, { ...filledFields, birthdayInput: "31/10/2570" }, { ...filledFields, province: "" }, { ...filledFields, ownerTel: "x" }]) expect(() => buildRegistrationRequest(normalEvent, fields, consent(), [], uuid)).toThrow();
  });
  it("matches month-ceiling/end-month and Royalalbino minus-one-day source rules", () => {
    expect(registrationAge("2024-01-31", "2024-02-29", false, "black")).toBe(1);
    expect(registrationAge("2024-01-31", "2024-03-01", false, "black")).toBe(2);
    expect(registrationAge("2023-10-31", "2026-10-31", true, "black")).toBe(36);
    expect(registrationAge("2023-10-31", "2026-10-31", true, "albino")).toBe(37);
  });
  it("uses current catalogs, explicit special selection and stripsSP only in submittedtype", () => {
    const encoded = encodeCompetitionClass({ name: "แม่พันธุ์", kind: "special", minMonths: 35, maxMonths: 40, minInclusive: true, group: "", criteria: "ตรวจฟันด้วยตนเอง" });
    const event = { ...normalEvent, catalogs: [{ level: "จังหวัด" as const, labels: [encoded, "อายุไม่เกิน 12 เดือน", "รุ่นคลุมเครืออายุหลายปี"] }] };
    expect(eligibleClasses(event, filledFields)).toEqual(["[SP] แม่พันธุ์"]);
    expect(buildRegistrationRequest(event, { ...filledFields, type: "[SP] แม่พันธุ์" }, consent(), [], uuid).type).toBe("แม่พันธุ์");
    expect(() => buildRegistrationRequest(event, filledFields, consent(), [], uuid)).toThrow("รุ่นแข่งขัน");
  });
});
describe("one immutable submission across double tap, timeout and closure", () => {
  const make = () => buildRegistrationRequest(normalEvent, filledFields, consent(), [], uuid);
  it("locks synchronously and retries the exact original payload+UUID after lost response, even after closure", async () => {
    const wait = deferred<{ registration: typeof registration; replayed: boolean }>(), send = jest.fn().mockReturnValueOnce(wait.promise).mockResolvedValueOnce({ registration, replayed: true }), change = jest.fn();
    const controller = createSubmission(send, change), factory = jest.fn(make);
    const first = controller.submit(factory); expect(await controller.submit(factory)).toBeNull();
    wait.resolve({ registration, replayed: false }); expect((await first)?.registration.id).toBe(registration.id); expect(send).toHaveBeenCalledTimes(1);
    const lost = createSubmission(jest.fn().mockRejectedValueOnce(new MobileApiError("response lost", "SERVICE_UNAVAILABLE", 503)).mockResolvedValueOnce({ registration, replayed: true }), change);
    await expect(lost.submit(factory)).rejects.toThrow(); const frozen = JSON.stringify(lost.pending?.payload);
    expect(lost.pending?.state).toBe("uncertain"); expect(() => lost.edit()).toThrow();
    expect((await lost.submit(() => { throw new Error("must not generate another payload after closure"); }))?.replayed).toBe(true); expect(JSON.stringify(lost.pending?.payload)).toBe(frozen);
  });
  it("treats a post-commit detail404 as uncertain rather than authorizing another UUID", async () => {
    const controller = createSubmission(jest.fn().mockRejectedValue(new MobileApiError("detail unavailable", "REGISTRATION_NOT_FOUND", 404)), jest.fn());
    await expect(controller.submit(make)).rejects.toThrow(); expect(controller.pending?.state).toBe("uncertain"); expect(() => controller.edit()).toThrow();
  });
  it("keeps rejected values and requires explicit edit before a new request", async () => {
    const controller = createSubmission(jest.fn().mockRejectedValue(new MobileApiError("closed", "REGISTRATION_CLOSED", 409)), jest.fn());
    await expect(controller.submit(make)).rejects.toThrow("closed"); expect(controller.pending?.payload.name).toBe(filledFields.name); expect(controller.pending?.state).toBe("rejected");
    await expect(controller.submit(make)).rejects.toThrow("แก้ไข"); controller.edit(); expect(controller.pending).toBeUndefined();
  });
});
describe("asynchronous microchip prefill", () => {
  it("does not overwrite newer edits or a changedAccount; permits manual no-chip names", async () => {
    let fields = { ...filledFields, microchip: "764040226601197" }, current = true;
    const wait = deferred<MobileCertDetail>(), apply = jest.fn(value => { fields = value; });
    const lookup = createBuffaloLookup({ fields: () => fields, read: () => wait.promise, current: async () => current, apply, state: jest.fn() });
    const operation = lookup.lookup(); fields = { ...fields, name: "ชื่อที่แก้ใหม่" };
    wait.resolve({ buffalo: { name: "ชื่อเก่า" }, rewards: [] } as unknown as MobileCertDetail); await operation; expect(apply).not.toHaveBeenCalled();
    current = false; await lookup.lookup(); expect(apply).not.toHaveBeenCalled();
    fields = { ...fields, microchip: "ไม่มีชิป ใช้ชื่อ" }; await lookup.lookup(); expect(apply).not.toHaveBeenCalled();
  });
});
