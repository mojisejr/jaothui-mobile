import { encodeCompetitionClass } from "../competitionClasses";
import { createBuffaloLookup, lookupBirthday } from "../lookup";
import { automaticClass, eligibleClasses, reconcileClasses, registrationAge, catalogClass, agreementsFor, buildRegistrationRequest } from "../model";
import { birthdayParts, birthdayDays, changeBirthdayPart, validBirthday } from "../birthday";
import { parseCalendarInput, posterAspectRatio } from "@/features/events/model";
import { filledFields, normalEvent } from "./fixtures";
import type { MobileCertDetail } from "@/types/mobile-api";
const event = { ...normalEvent, ageCutoffDay: "2026-11-23", catalogs: [{ level: "ประเทศ" as const, labels: ["อายุไม่เกิน 36 เดือน", "[SP] แม่ลูก"] }, { level: "จังหวัด" as const, labels: ["อายุไม่เกิน 36 เดือน", "[SP] แม่ลูก"] }] };
describe("certificate DTO and class parity", () => {
  it("fills actual BFF millisecond/null birthday/Female/Black shape and 32 month age", async () => {
    let fields = { ...filledFields, microchip: "123456789012" };
    const result = { buffalo: { name: "fixture", birthday: null, birthdate: Date.parse("2024-04-15T00:00:00Z"), sex: " Female ", color: "Black" } } as MobileCertDetail;
    await createBuffaloLookup({ fields: () => fields, read: async () => result, current: async () => true, apply: next => { fields = reconcileClasses(event, next, fields); }, state: jest.fn() }).lookup();
    expect(fields).toMatchObject({ birthdayInput: "15/04/2567", sex: "female", color: "black", level: "จังหวัด", type: "อายุไม่เกิน 36 เดือน", ownerName: filledFields.ownerName });
    expect(registrationAge(parseCalendarInput(fields.birthdayInput).day!, event.ageCutoffDay, false, fields.color)).toBe(32);
    fields = { ...fields, classMode: "special", type: "[SP] แม่ลูก" };
    await createBuffaloLookup({ fields: () => fields, read: async () => result, current: async () => true, apply: next => { fields = reconcileClasses(event, next, fields); }, state: jest.fn() }).lookup();
    expect(fields).toMatchObject({ classMode: "special", type: "[SP] แม่ลูก" });
    result.buffalo.birthday = null; result.buffalo.birthdate = null; result.buffalo.sex = "unknown"; result.buffalo.color = null;
    await createBuffaloLookup({ fields: () => fields, read: async () => result, current: async () => true, apply: next => { fields = reconcileClasses(event, next, fields); }, state: jest.fn() }).lookup();
    expect(fields).toMatchObject({ birthdayInput: "", sex: "", color: "", type: "" });
    expect(eligibleClasses(event, fields)).toEqual([]);
  });
  it("supports explicitly bounded legacy seconds and strict ISO dates", () => {
    expect(lookupBirthday(null, Date.parse("2024-04-15T00:00:00Z") / 1000)).toBe("15/04/2567");
    expect(lookupBirthday("2024-04-15", null)).toBe("15/04/2567");
    for (const day of ["2024-02-30", "2024-04-15garbage", "1899-01-01", "2999-01-01"]) expect(lookupBirthday(day, null)).toBe("");
    expect(lookupBirthday(null, NaN)).toBe("");
  });
  it("prioritizes province, falls back to national, never autoassigns special traits", () => {
    expect(automaticClass(event, { ...filledFields, birthdayInput: "15/04/2567" })?.level).toBe("จังหวัด");
    expect(automaticClass({ ...event, catalogs: [event.catalogs[0]] }, { ...filledFields, birthdayInput: "15/04/2567" })?.level).toBe("ประเทศ");
    expect(automaticClass({ ...event, catalogs: [{ level: "จังหวัด", labels: ["[SP] แม่ลูก"] }] }, filledFields)).toBeNull();
  });
  it("preserves eligible normal choices on edits and clears incompatible choices", () => {
    const fields = { ...filledFields, classMode: "special" as const, type: "[SP] แม่ลูก" };
    expect(reconcileClasses(event, fields).type).toBe(fields.type);
    expect(reconcileClasses(event, { ...fields, ownerName: "edited" }, fields).type).toBe(fields.type);
    expect(reconcileClasses(event, { ...fields, color: "albino" }, fields).classMode).toBe("special");
    expect(reconcileClasses(event, { ...fields, microchip: "different" }, fields).type).toBe(fields.type);
    expect(reconcileClasses(event, { ...fields, birthdayInput: "" }, fields).type).toBe("");
    expect(reconcileClasses({ ...event, catalogs: [{ level: "จังหวัด", labels: [] }] }, fields).type).toBe("");
  });
});
describe("non-typing Thai date and full poster geometry", () => {
  it("clears invalid day without clamping or retaining a previous canonical date", () => {
    const partial = changeBirthdayPart("31/01/2567", 1, "04");
    expect(partial).toBe("/04/2567"); expect(parseCalendarInput(partial).day).toBeUndefined();
    expect(changeBirthdayPart("29/02/2567", 2, "2566")).toBe("/02/2566");
    expect(birthdayDays("02", "2567")).toBe(29);
    expect(birthdayParts("15/04/2024")).toEqual(["15", "04", "2567"]);
    expect(parseCalendarInput(changeBirthdayPart(partial, 0, "30")).day).toBe("2024-04-30");
    expect(validBirthday("2026-10-30", new Date("2026-10-29T03:00:00Z"))).toBe(false);
  });
  it("derives portrait, landscape and tall detail ratios with stable missing/invalid fallback", () => {
    for (const [dimensions, ratio] of [["800x1000", .8], ["1600x900", 16 / 9], ["800x3200", .25]] as const) expect(posterAspectRatio(`https://cdn.sanity.io/images/p/d/abc-${dimensions}.jpg?w=800`)).toBe(ratio);
    for (const url of [null, "bad", "https://example.com/abc-800x3200.jpg", "https://cdn.sanity.io/images/p/d/abc-0x100.jpg"]) expect(posterAspectRatio(url)).toBe(16 / 9);
  });
});

describe("structured production catalogs preserve rule metadata", () => {
  const name = "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน";
  const ageRule = encodeCompetitionClass({ name, kind: "age", minMonths: 24, maxMonths: 36, minInclusive: false, group: "ควายสวยงาม", criteria: "" });
  const specialName = "ท้องถิ่น รวมสี อายุ 24–36 เดือน — ตรวจสิทธิ์หน้างาน";
  const specialRule = encodeCompetitionClass({ name: specialName, kind: "special", minMonths: 24, maxMonths: 36, minInclusive: false, group: "ท้องถิ่น", criteria: "ตรวจสิทธิ์ท้องถิ่น" });
  const productionEvent = { ...event, catalogs: [{ level: "ประเทศ" as const, labels: [ageRule, specialRule] }] };
  const fields = { ...filledFields, birthdayInput: "15/04/2567", level: "ประเทศ" as const };
  it("selects the actual 24–36 month structured division for the reported 32-month birthday and submits its display name", () => {
    expect(registrationAge("2024-04-15", productionEvent.ageCutoffDay, false, "black")).toBe(32);
    expect(automaticClass(productionEvent, fields)).toEqual({ level: "ประเทศ", type: name });
    const selected = reconcileClasses(productionEvent, fields);
    expect(selected.type).toBe(name);
    const agreements = Object.fromEntries(agreementsFor(productionEvent).map(c => [c.key, true]));
    expect(buildRegistrationRequest(productionEvent, selected, agreements, [], "regression-32-months")).toMatchObject({ type: name, buffaloAge: 32, level: "ประเทศ" });
  });
  it("retains structured special kind and eligibility without reparsing its descriptive name", () => {
    const label = `[SP] ${specialName}`;
    expect(catalogClass(productionEvent, fields, label)?.kind).toBe("special");
    expect(reconcileClasses(productionEvent, { ...fields, classMode: "special", type: label }).type).toBe(label);
    expect(eligibleClasses(productionEvent, { ...fields, birthdayInput: "23/11/2567" })).not.toContain(label);
    expect(eligibleClasses(productionEvent, { ...fields, birthdayInput: "23/10/2567" })).toContain(name);
    expect(eligibleClasses(productionEvent, { ...fields, birthdayInput: "23/11/2566" })).toContain(name);
    expect(eligibleClasses(productionEvent, { ...fields, birthdayInput: "23/10/2566" })).not.toContain(name);
  });
});
