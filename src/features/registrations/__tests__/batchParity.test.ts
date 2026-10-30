import { buildRegistrationRequest, agreementsFor, emptyFields, migrateOwnerFields, reconcileClasses, specialChoices, registrationActive, historyStatusLabel } from "../model";
import { getProvinces, getAmphoeFromProvince, getDistrictsFromAmphoe } from "../addressHelper";
import { createBuffaloLookup } from "../lookup";
import { encodeCompetitionClass } from "../competitionClasses";
import { filledFields, normalEvent, royalEvent, photoIds, registration } from "./fixtures";
// Canonical Event competition-class-options fixture + reported production division.
const age = encodeCompetitionClass({ name: "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน", kind: "age", minMonths: 24, maxMonths: 36, minInclusive: false, group: "ควายสวยงาม", criteria: "" });
const special = encodeCompetitionClass({ name: "ฟันแท้", kind: "special", minMonths: 14, maxMonths: null, minInclusive: true, group: "ยักษ์", criteria: "เจ้าหน้าที่ตรวจฟัน" });
const event = { ...normalEvent, ageCutoffDay: "2026-11-23", catalogs: [{ level: "จังหวัด" as const, labels: [age] }, { level: "ประเทศ" as const, labels: [age, special] }] };
const fields = { ...filledFields, birthdayInput: "15/04/2567" };
const consent = (royal = false) => Object.fromEntries(agreementsFor(royal ? royalEvent : normalEvent).map(c => [c.key, true]));
describe("consolidated Event source parity regressions", () => {
  it("requires separate first and last names and concatenates only at request boundary", () => {
    for (const part of ["firstName", "lastName"] as const) expect(() => buildRegistrationRequest(normalEvent, { ...filledFields, [part]: "", ownerName: "legacy full name" }, consent(), [], "uuid")).toThrow("ชื่อและนามสกุล");
    expect(buildRegistrationRequest(normalEvent, { ...filledFields, firstName: "ชื่อ", lastName: "นามสกุล", ownerName: "obsolete" }, consent(), [], "uuid").ownerName).toBe("ชื่อ นามสกุล");
  });
  it("migrates legacy names conservatively without inventing surname and keeps pending semantics separate", () => {
    const legacy = { ...emptyFields(), ownerName: "ชื่อ นาม สกุล", firstName: undefined, lastName: undefined };
    expect(migrateOwnerFields(legacy as unknown as typeof fields)).toMatchObject({ firstName: "ชื่อ", lastName: "นาม สกุล" });
    expect(migrateOwnerFields({ ...legacy, ownerName: "ชื่อเดียว" } as unknown as typeof fields).lastName).toBe("");
    expect(migrateOwnerFields(filledFields)).toBe(filledFields);
  });
  it("shows national specials independently while retaining explicit province selection", () => {
    const before = reconcileClasses(event, fields);
    expect(reconcileClasses(event, { ...before, classMode: "special", type: "" }, before)).toMatchObject({ classMode: "auto", level: "จังหวัด", type: "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน" });
    expect(specialChoices(event, fields)).toEqual([{ level: "ประเทศ", type: "[SP] ฟันแท้" }]);
  });
  it("normal sex/color and chip edits preserve a still-eligible special", () => {
    const before = { ...fields, level: "ประเทศ" as const, classMode: "special" as const, type: "[SP] ฟันแท้" };
    for (const patch of [{ sex: "male" as const }, { color: "albino" as const }]) expect(reconcileClasses(event, { ...before, ...patch }, before).type).toBe(before.type);
    expect(reconcileClasses(event, { ...before, microchip: "short-id" }, before).type).toBe(before.type);
  });
  it("Royal combined choices retain explicit special until computed age changes and remove obsolete all-age mode", () => {
    const royal = { ...event, formKind: "royal" as const };
    const before = { ...fields, level: "ประเทศ" as const, classMode: "special" as const, type: "[SP] ฟันแท้" };
    expect(reconcileClasses(royal, { ...before, sex: "male", microchip: "short" }, before).type).toBe(before.type);
    expect(reconcileClasses(royal, { ...before, birthdayInput: "15/03/2567" }, before).classMode).toBe("auto");
    expect(reconcileClasses(royal, { ...before, classMode: "manual" }).classMode).toBe("auto");
    expect(reconcileClasses(royal, { ...before, birthdayInput: "" }, before).type).toBe("");
  });
  it("uses canonical dependent Thai address data and refuses stale child selections", () => {
    expect(getProvinces()).toContain("กรุงเทพมหานคร"); expect(getAmphoeFromProvince("กรุงเทพมหานคร")).toContain("พระนคร"); expect(getDistrictsFromAmphoe("กรุงเทพมหานคร", "พระนคร")).toContain("พระบรมมหาราชวัง");
    expect(getAmphoeFromProvince("")).toEqual([]); expect(getDistrictsFromAmphoe("", "")).toEqual([]);
    expect(() => buildRegistrationRequest(royalEvent, { ...filledFields, province: "กระบี่" }, consent(true), photoIds, "uuid")).toThrow("ตรงกัน");
  });
  it("permits bounded source text and short microchip searches, retains latest-edit guard", async () => {
    for (const microchip of ["12", "ควายไม่มีชิป"]) {
      let value = { ...filledFields, microchip };
      const read = jest.fn(async () => ({ buffalo: { name: "chain", sex: "Female", color: "Black", birthday: null, birthdate: 1713139200 } }));
      await createBuffaloLookup({ fields: () => value, read, current: async () => true, apply: next => { value = next; }, state: jest.fn() }).lookup();
      expect(read).toHaveBeenCalledWith(microchip); expect(value.name).toBe("chain"); expect(value.birthdayInput).toBe("15/04/2567");
    }
    expect(buildRegistrationRequest(normalEvent, { ...filledFields, microchip: " " }, consent(), [], "uuid").microchip).toBe(filledFields.name);
  });
  it("still requires all twelve Royal answers to be explicitly yes including source omission accept9", () => {
    for (const clause of agreementsFor(royalEvent)) expect(() => buildRegistrationRequest(royalEvent, filledFields, { ...consent(true), [clause.key]: false }, photoIds, "uuid")).toThrow("ยินยอม");
  });
  it("uses inclusive Bangkok end day for active/past and normal ended label, retaining Royal approval labels", () => {
    expect(registrationActive({ ...registration, event: { ...registration.event, endDay: "2026-10-29" } }, new Date("2026-10-29T16:59:59Z"))).toBe(true);
    expect(registrationActive({ ...registration, event: { ...registration.event, endDay: "2026-10-29" } }, new Date("2026-10-29T17:00:00Z"))).toBe(false);
    expect(historyStatusLabel(registration)).toBe("จบงานแล้ว");
    expect(historyStatusLabel({ ...registration, status: "rejected" })).toBe("ไม่ผ่านการพิจารณา");
  });
});
