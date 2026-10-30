import type { EventDetail, RegistrationResult } from "@/types/events";
import { MobileApiError } from "@/api/client";
import { encodeCompetitionClass } from "../competitionClasses";
import { emptyFields, normalOptions, prepareRegistrationFields, reconcileClasses, registrationAge, automaticClass, buildRegistrationRequest, agreementsFor } from "../model";
import { defaultNormalLevel, normalClassOptions, suggestNormalSelection, reconcileNormalSelection } from "../normalLevels";
import { beginAnotherNormalRegistration, eventDraft } from "../drafts";
import { createSubmission } from "../submission";
import { filledFields, normalEvent, royalEvent, registration } from "./fixtures";
const rule = (name: string, kind: "age" | "special", minMonths: number | null, maxMonths: number | null, minInclusive = false) => encodeCompetitionClass({ name, kind, minMonths, maxMonths, minInclusive, group: "", criteria: kind === "special" ? "ตรวจสิทธิ์หน้างาน" : "" });
// Source production DOB/cutoff and encoded national/local catalog rules, not parsed display labels.
const national = rule("ควายรุ่น อายุมากกว่า 18–24 เดือน", "age", 18, 24);
const local = rule("ควายรุ่น — มากกว่า 18 ถึงไม่เกิน 24 เดือน", "age", 18, 24);
const special = rule("แชมป์วัย 20–22", "special", 20, 22, true);
const event: EventDetail = { ...normalEvent, ageCutoffDay: "2026-11-23", catalogs: [{ level: "ประเทศ", labels: [national, special] }, { level: "จังหวัด", labels: [local] }] };
const fields = { ...filledFields, birthdayInput: "23/03/2568", level: "" as const, type: "" };
const consent = Object.fromEntries(agreementsFor(event).map(c => [c.key, true]));
const result: RegistrationResult = { registration: { ...registration, buffalo: { ...registration.buffalo, level: "ประเทศ" } }, replayed: false };
describe("latest Event normal-level selector contract", () => {
  it("uses national regular first for the actual both-level 20-month case; Royal stays province-first", () => {
    expect(registrationAge("2025-03-23", event.ageCutoffDay, false, "black")).toBe(20);
    const initial = prepareRegistrationFields(event, { ...fields, level: "จังหวัด" });
    expect(initial).toMatchObject({ level: "ประเทศ", type: "ควายรุ่น อายุมากกว่า 18–24 เดือน", normalSelectionVersion: 1 });
    expect(automaticClass({ ...event, formKind: "royal" }, fields)?.level).toBe("จังหวัด");
    expect(prepareRegistrationFields({ ...event, formKind: "royal" }, { ...fields, level: "จังหวัด" })).toMatchObject({ level: "จังหวัด", type: "ควายรุ่น — มากกว่า 18 ถึงไม่เกิน 24 เดือน" });
  });
  it("suggests normal age classes immediately from a manual DOB while sex/color remain blank; submission and Royal still require them", () => {
    const entered = { ...fields, sex: "" as const, color: "" as const };
    const selected = reconcileClasses(event, entered);
    expect(selected).toMatchObject({ level: "ประเทศ", type: "ควายรุ่น อายุมากกว่า 18–24 เดือน" });
    expect(() => buildRegistrationRequest(event, selected, consent, [], "manual-dob")).toThrow("เพศและสี");
    expect(normalOptions({ ...event, formKind: "royal" }, entered)).toEqual({ nationalTypes: [], provinceTypes: [], specialNationalTypes: [], specialProvinceTypes: [] });
  });
  it("matches source default precedence including regular before SP-only levels, never auto-selects SP", () => {
    const options = normalOptions(event, fields);
    expect(defaultNormalLevel(options)).toBe("ประเทศ");
    expect(defaultNormalLevel({ ...options, nationalTypes: [] })).toBe("จังหวัด");
    expect(defaultNormalLevel({ ...options, nationalTypes: [], provinceTypes: [] })).toBe("ประเทศ");
    const onlyLocalSP = { nationalTypes: [], provinceTypes: [], specialNationalTypes: [], specialProvinceTypes: ["[SP] ท้องถิ่น"] };
    expect(suggestNormalSelection({ level: "", type: "" }, onlyLocalSP)).toEqual({ level: "จังหวัด", type: "" });
    expect(suggestNormalSelection({ level: "", type: "" }, { ...onlyLocalSP, specialProvinceTypes: [] })).toEqual({ level: "", type: "" });
    expect(normalClassOptions(options, "")).toEqual({ regular: [], special: [] });
  });
  it("preserves explicit province, including a now-empty local catalog, without jumping to national", () => {
    const chosen = reconcileClasses(event, { ...fields, level: "จังหวัด" });
    expect(chosen.type).toBe("ควายรุ่น — มากกว่า 18 ถึงไม่เกิน 24 เดือน");
    expect(prepareRegistrationFields(event, chosen)).toEqual(chosen);
    const emptyLocal = { ...event, catalogs: [event.catalogs[0]] };
    expect(reconcileClasses(emptyLocal, chosen)).toMatchObject({ level: "จังหวัด", type: "" });
    expect(reconcileClasses(event, { ...chosen, level: "ประเทศ" }, chosen)).toMatchObject({ level: "ประเทศ", type: "ควายรุ่น อายุมากกว่า 18–24 เดือน" });
    expect(reconcileNormalSelection({ level: "จังหวัด", type: "stale" }, normalOptions(event, fields))).toEqual({ level: "จังหวัด", type: "" });
  });
  it("preserves valid SP on input changes, respects encoded bounds and clears invalid DOB/catalog selections", () => {
    const chosen = reconcileClasses(event, { ...fields, level: "ประเทศ", type: "[SP] แชมป์วัย 20–22" });
    expect(chosen.type).toBe("[SP] แชมป์วัย 20–22");
    expect(reconcileClasses(event, { ...chosen, microchip: "ชื่อควายไม่มีชิป" }, chosen).type).toBe(chosen.type);
    expect(normalOptions(event, { ...fields, birthdayInput: "23/04/2568" }).specialNationalTypes).toEqual([]);
    expect(normalOptions(event, { ...fields, birthdayInput: "23/01/2568" }).specialNationalTypes).toEqual([chosen.type]);
    expect(normalOptions(event, { ...fields, birthdayInput: "23/12/2567" }).specialNationalTypes).toEqual([]);
    expect(reconcileClasses(event, { ...chosen, birthdayInput: "" }, chosen)).toMatchObject({ level: "ประเทศ", type: "" });
    expect(reconcileClasses(event, { ...chosen, birthdayInput: "23/04/2568" }, chosen)).toMatchObject({ level: "ประเทศ", type: "ควายรุ่น อายุมากกว่า 18–24 เดือน" });
    expect(reconcileClasses({ ...event, catalogs: [{ level: "ประเทศ", labels: [national] }] }, chosen).type).toBe("ควายรุ่น อายุมากกว่า 18–24 เดือน");
  });
  it("migrates only old implicit auto defaults and preserves old explicit SP level", () => {
    expect(prepareRegistrationFields(event, { ...fields, level: "จังหวัด", classMode: "auto" }).level).toBe("ประเทศ");
    expect(prepareRegistrationFields(event, { ...fields, level: "จังหวัด", classMode: "special" }).level).toBe("จังหวัด");
    expect(prepareRegistrationFields(event, { ...fields, level: "ประเทศ", type: "[SP] แชมป์วัย 20–22" }).type).toBe("[SP] แชมป์วัย 20–22");
    expect(emptyFields().level).toBe("จังหวัด");
    expect(prepareRegistrationFields(royalEvent, filledFields).level).toBe("จังหวัด");
  });
});
describe("confirmed same-animal next registration and immutable retry", () => {
  it("starts a separate operation for the same raw chip/name, clears four consents and keeps the old receipt", async () => {
    const draft = eventDraft("next-account", event.id);
    draft.fields = prepareRegistrationFields(event, { ...fields, microchip: "  ควายชื่อเดิม  " }); draft.agreements = consent;
    const send = jest.fn(async () => result);
    const first = createSubmission(send, () => { draft.pending = first.pending; });
    draft.receipt = (await first.submit(() => buildRegistrationRequest(event, draft.fields, draft.agreements, [], "first-id")))!;
    expect(first.pending?.payload.operationId).toBe("first-id");
    const next = beginAnotherNormalRegistration("next-account", event, draft);
    expect(next).not.toBe(draft);
    expect(next.fields).toEqual({ ...draft.fields, level: "จังหวัด", type: "ควายรุ่น — มากกว่า 18 ถึงไม่เกิน 24 เดือน", classMode: "auto" });
    expect(next.agreements).toEqual({}); expect(next.receipt).toBeUndefined(); expect(next.pending).toBeUndefined();
    expect(draft.receipt).toBe(result); expect(first.pending?.payload.level).toBe("ประเทศ");
    expect(() => buildRegistrationRequest(event, reconcileClasses(event, next.fields), next.agreements, [], "second-id")).toThrow("ข้อตกลง");
    const second = createSubmission(send, () => { next.pending = second.pending; });
    await second.submit(() => buildRegistrationRequest(event, reconcileClasses(event, next.fields), consent, [], "second-id"));
    expect(send.mock.calls).toHaveLength(2);
    expect(first.pending?.payload).toMatchObject({ operationId: "first-id", level: "ประเทศ", microchip: "  ควายชื่อเดิม  " });
    expect(second.pending?.payload).toMatchObject({ operationId: "second-id", level: "จังหวัด", microchip: "  ควายชื่อเดิม  " });
  });
  it.each([{ labels: [] as string[] }, { labels: [special] }])("keeps the opposite level selected without auto-choosing an SP-only or empty class", ({ labels }) => {
    const draft = eventDraft("opposite-empty-account", event.id);
    draft.fields = prepareRegistrationFields(event, fields); draft.receipt = result;
    const next = beginAnotherNormalRegistration("opposite-empty-account", { ...event, catalogs: [event.catalogs[0], { level: "จังหวัด", labels }] }, draft);
    expect(next.fields).toMatchObject({ level: "จังหวัด", type: "" });
  });
  it("refuses another registration before confirmation, for Royal or after account replacement", () => {
    const draft = eventDraft("guard-account", event.id);
    expect(() => beginAnotherNormalRegistration("guard-account", event, draft)).toThrow("ยืนยันผล");
    draft.receipt = result;
    expect(() => beginAnotherNormalRegistration("guard-account", { ...event, formKind: "royal" }, draft)).toThrow("ยืนยันผล");
    eventDraft("other-account", event.id);
    expect(() => beginAnotherNormalRegistration("guard-account", event, draft)).toThrow("บัญชี");
  });
  it("never starts a new operation after uncertain/malformed success; restored requests retain exact level and payload", async () => {
    const draft = eventDraft("uncertain-account", event.id);
    draft.fields = prepareRegistrationFields(event, fields); draft.agreements = consent;
    const send = jest.fn().mockRejectedValueOnce(new MobileApiError("lost", "SERVICE_UNAVAILABLE", 503)).mockResolvedValue({ registration: result.registration, replayed: true });
    const first = createSubmission(send, () => { draft.pending = first.pending; });
    await expect(first.submit(() => buildRegistrationRequest(event, draft.fields, consent, [], "immutable"))).rejects.toThrow();
    const original = JSON.parse(JSON.stringify(first.pending!.payload));
    expect(() => beginAnotherNormalRegistration("uncertain-account", event, draft)).toThrow();
    const retry = createSubmission(send, jest.fn(), draft.pending);
    await retry.submit(() => { throw new Error("must not regenerate payload"); });
    expect(send.mock.calls[1][0]).toEqual(original);
    const malformed = createSubmission(async () => ({ replayed: false }) as RegistrationResult, jest.fn());
    await expect(malformed.submit(() => original)).rejects.toThrow("รหัสใบสมัคร");
    expect(malformed.pending?.state).toBe("uncertain"); expect(() => malformed.edit()).toThrow();
  });
});
