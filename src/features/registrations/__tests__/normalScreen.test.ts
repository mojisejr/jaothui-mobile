import React, { useEffect as mockUseEffect } from "react";
import { RegistrationScreen } from "../RegistrationScreen";
import { RegistrationFormView, type RegistrationFormViewProps } from "../RegistrationFormView";
import { RegistrationDetailView } from "../RegistrationDetailView";
import { eventDraft } from "../drafts";
import { agreementsFor, buildRegistrationRequest, emptyFields } from "../model";
import { encodeCompetitionClass } from "../competitionClasses";
import type { RegistrationRequest, RegistrationResult } from "@/types/events";
import type { MobileAppleAccountSession } from "@/types/mobile-api";
import { normalEvent, royalEvent, filledFields, registration } from "./fixtures";
import { NotificationInvitation } from "@/notifications/NotificationInvitation";
let mockSession: MobileAppleAccountSession | null;
const mockGet = jest.fn(), mockSend = jest.fn(), mockPrivate = jest.fn(), mockSame = jest.fn(), mockUUID = jest.fn(), mockLookup = jest.fn();
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => (() => void)) => mockUseEffect(callback, [callback]), useRouter: () => ({ replace: jest.fn() }), useLocalSearchParams: () => ({ eventId: "fixture-event" }) }));
jest.mock("expo-crypto", () => ({ randomUUID: () => mockUUID() }));
jest.mock("@/api/events", () => ({ getEventDetail: () => mockGet(), submitEventRegistration: (...args: unknown[]) => mockSend(...args), getEventMember: jest.fn(), getRegistrationBuffalo: (...args: unknown[]) => mockLookup(...args), uploadEventImage: jest.fn() }));
jest.mock("../privateRequest", () => ({ eventPrivateRequest: () => mockPrivate() }));
jest.mock("../customer", () => ({ sameCustomer: (...args: unknown[]) => mockSame(...args), eventAccountError: (error: Error) => error.message }));
jest.mock("../nativePhotos", () => ({ selectApplicantPhoto: jest.fn(), normalizeApplicantPhoto: jest.fn(), readApplicantBytes: jest.fn() }));
jest.mock("../useDraftExit", () => ({ useDraftExit: () => ({ visible: false, blocked: false, onStay: jest.fn(), onDiscard: jest.fn() }) }));
jest.mock("../CustomerGate", () => ({ CustomerGate: () => null }));
jest.mock("@/notifications/NotificationInvitation", () => ({ NotificationInvitation: () => null }));
jest.mock("@/features/profile/sessionRecovery", () => ({ recoverRejectedMobileSession: jest.fn() }));
jest.mock("@/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (callback: () => void | Promise<void>) => Promise<void>; create: (element: React.ReactElement) => { root: TestNode; unmount: () => void; toJSON: () => unknown } };
type TestNode = { props: { onPress: () => void }; findByProps: (props: Record<string, unknown>) => TestNode; findByType: (type: unknown) => { props: unknown }; findAllByType: (type: unknown) => TestNode[] };
const event = { ...normalEvent, catalogs: [normalEvent.catalogs[0], { ...normalEvent.catalogs[0], level: "ประเทศ" as const }] };
const ageClass = (name: string, minMonths: number, maxMonths: number) => encodeCompetitionClass({ name, kind: "age", minMonths, maxMonths, minInclusive: false, group: "", criteria: "" });
const reportedEvent = { ...normalEvent, ageCutoffDay: "2026-11-23", catalogs: [
  { level: "ประเทศ" as const, labels: [ageClass("ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน", 24, 36)] },
  { level: "จังหวัด" as const, labels: [ageClass("ควายรุ่น มากกว่า 18–24 เดือน", 18, 24), ageClass("ลูกควาย มากกว่า 10–18 เดือน", 10, 18)] },
] };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
describe("mounted normal controller rebinding", () => {
  let tree: ReturnType<typeof renderer.create>;
  beforeEach(() => {
    jest.resetAllMocks();
    mockSession = { sessionToken: "current", expiresAt: 4e9, identity: { sessionVersion: 2, accountId: `screen-${expect.getState().currentTestName}`, providerUserId: "apple", appleUserId: "apple", provider: "apple", linkedWallet: null, email: null, displayName: null, avatarUrl: null } };
    mockSame.mockImplementation(async (session: MobileAppleAccountSession) => !!mockSession && session.sessionToken === mockSession.sessionToken && session.identity.accountId === mockSession.identity.accountId);
    mockGet.mockResolvedValue(event);
    mockPrivate.mockImplementation(async () => ({ session: mockSession, value: { member: { id: "member", tel: "0812345678" } } }));
    mockUUID.mockReturnValueOnce("first-id").mockReturnValueOnce("second-id");
    mockSend.mockImplementation(async (_token: string, _event: string, payload: RegistrationRequest) => ({ registration: { ...registration, id: payload.operationId, buffalo: { ...registration.buffalo, level: payload.level } }, replayed: false }));
    const draft = eventDraft(mockSession.identity.accountId, event.id);
    draft.fields = { ...filledFields, level: "ประเทศ", normalSelectionVersion: 1 }; draft.agreements = Object.fromEntries(agreementsFor(event).map(c => [c.key, true]));
  });
  afterEach(async () => { if (tree) await renderer.act(() => tree.unmount()); });
  const form = () => tree.root.findByType(RegistrationFormView).props as RegistrationFormViewProps;
  const mount = async () => { await renderer.act(async () => { tree = renderer.create(React.createElement(RegistrationScreen)); }); };
  const press = async (label: string) => { await renderer.act(async () => { tree.root.findByProps({ accessibilityLabel: label, accessibilityRole: "button" }).props.onPress(); }); };
  it("selects the country 24–36 class after a fresh microchip lookup for the reported 32-month animal", async () => {
    mockGet.mockResolvedValue(reportedEvent);
    eventDraft(mockSession!.identity.accountId, event.id).fields = emptyFields();
    mockLookup.mockResolvedValue({ buffalo: { name: "กระบือทดสอบ", sex: "female", color: "black", birthday: "2024-04-15", birthdate: null } });
    await mount();
    await renderer.act(async () => form().onChange({ ...form().value, microchip: "synthetic-chip" }));
    await renderer.act(async () => form().onLookup());
    expect(form().value).toMatchObject({ level: "ประเทศ", type: "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน", birthdayInput: "15/04/2567" });
    expect(mockLookup).toHaveBeenCalledWith("current", "synthetic-chip"); expect(mockSend).not.toHaveBeenCalled();
  });
  it("preserves an explicit province choice on lookup and offers a clear switch without changing the level silently", async () => {
    mockGet.mockResolvedValue(reportedEvent);
    eventDraft(mockSession!.identity.accountId, event.id).fields = emptyFields();
    mockLookup.mockResolvedValue({ buffalo: { name: "กระบือทดสอบ", sex: "female", color: "black", birthday: "2024-04-15", birthdate: null } });
    await mount();
    await renderer.act(async () => form().onChange({ ...form().value, level: "จังหวัด", microchip: "synthetic-chip" }));
    await renderer.act(async () => form().onLookup());
    expect(form().value).toMatchObject({ level: "จังหวัด", type: "", birthdayInput: "15/04/2567" });
    expect(JSON.stringify(tree.toJSON())).toContain("งานนี้ไม่มีรุ่น");
    await press("ดูรุ่นระดับประเทศ");
    expect(form().value).toMatchObject({ level: "ประเทศ", type: "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน" });
  });
  it("rebinds after confirmed success and sends a second level with a fresh ID, retaining first receipt/history action", async () => {
    await mount(); const stale = form();
    await renderer.act(async () => stale.onSubmit());
    expect(tree.root.findAllByType(RegistrationDetailView)).toHaveLength(1);
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(1);
    expect(tree.root.findByProps({ accessibilityLabel: "ดูประวัติการสมัครของฉัน" })).toBeDefined();
    await press("สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น");
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(0);
    expect(form().value).toMatchObject({ level: "จังหวัด", type: filledFields.type, firstName: filledFields.firstName, name: filledFields.name });
    expect(form().agreements).toEqual({}); expect(form().pending).toBeUndefined();
    // An old controller callback cannot submit the first payload into the new Ready binding.
    await renderer.act(async () => stale.onSubmit()); expect(mockSend).toHaveBeenCalledTimes(1);
    for (const clause of agreementsFor(event)) await renderer.act(async () => form().onAgreement(clause.key, true));
    await renderer.act(async () => form().onSubmit());
    expect(mockSend.mock.calls.map(call => call[2])).toMatchObject([{ operationId: "first-id", level: "ประเทศ" }, { operationId: "second-id", level: "จังหวัด" }]);
    expect(mockSend.mock.calls[0][2].microchip).toBe(mockSend.mock.calls[1][2].microchip);
    expect(mockUUID).toHaveBeenCalledTimes(2);
  });
  it("keeps uncertain retry immutable and never exposes the next-entry action before confirmation", async () => {
    mockSend.mockRejectedValueOnce(new Error("response lost"));
    await mount(); await renderer.act(async () => form().onSubmit());
    expect(form().pending).toBe("uncertain"); expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(0); expect(JSON.stringify(tree.toJSON())).not.toContain("สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น");
    const first = JSON.parse(JSON.stringify(mockSend.mock.calls[0][2]));
    await renderer.act(async () => form().onSubmit());
    expect(mockSend.mock.calls[1][2]).toEqual(first); expect(mockUUID).toHaveBeenCalledTimes(1);
  });
  it.each(["normal", "royal"] as const)("places the invitation only after a confirmed %s registration receipt", async kind => {
    mockGet.mockResolvedValue(kind === "royal" ? royalEvent : event);
    const draft = eventDraft(mockSession!.identity.accountId, event.id);
    draft.receipt = { registration: { ...registration, event: { ...registration.event, eventType: kind } }, replayed: false };
    await mount();
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(1);
    expect(tree.root.findAllByType(RegistrationDetailView)).toHaveLength(1);
  });
  it("does not invite while only enrolling membership or when initial event loading fails", async () => {
    mockPrivate.mockImplementation(async () => ({ session: mockSession, value: { member: null } }));
    await renderer.act(async () => { tree = renderer.create(React.createElement(RegistrationScreen, { memberMode: true })); });
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(0);
    await renderer.act(async () => tree.unmount());
    mockGet.mockRejectedValue(new Error("event unavailable")); await mount();
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(0);
  });
  it.each(["logout", "account switch"])("drops late successful results after %s and keeps the old operation frozen for recovery", async change => {
    const late = deferred<RegistrationResult>(); mockSend.mockReturnValueOnce(late.promise);
    await mount(); await renderer.act(async () => form().onSubmit());
    const previous = mockSession!; mockSession = change === "logout" ? null : { ...previous, sessionToken: "new-account", identity: { ...previous.identity, accountId: "new-account" } };
    await renderer.act(async () => { late.resolve({ registration, replayed: false }); });
    expect(tree.root.findAllByType(RegistrationDetailView)).toHaveLength(0);
    expect(eventDraft(previous.identity.accountId, event.id).pending).toMatchObject({ state: "uncertain", payload: { operationId: "first-id" } });
    expect(JSON.stringify(tree.toJSON())).not.toContain("สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น");
  });
  it("keeps old frozen normal drafts unchanged even when the eligible national default differs", async () => {
    const draft = eventDraft(mockSession!.identity.accountId, event.id);
    draft.fields = { ...filledFields, level: "จังหวัด", classMode: "auto" };
    const original = buildRegistrationRequest(event, draft.fields, draft.agreements, [], "frozen-old");
    draft.pending = { payload: original, state: "uncertain" };
    await mount();
    expect(form().value).toEqual({ ...filledFields, level: "จังหวัด", classMode: "auto" });
    await renderer.act(async () => form().onSubmit());
    expect(mockSend.mock.calls[0][2]).toEqual(original); expect(mockUUID).not.toHaveBeenCalled();
  });
  it("retains the confirmed receipt if account validation storage fails during the new-entry action", async () => {
    await mount(); await renderer.act(async () => form().onSubmit());
    mockSame.mockRejectedValueOnce(new Error("account storage unavailable"));
    await press("สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น");
    expect(tree.root.findAllByType(RegistrationDetailView)).toHaveLength(1);
    expect(JSON.stringify(tree.toJSON())).toContain("account storage unavailable"); expect(mockSend).toHaveBeenCalledTimes(1);
  });
  it("rechecks current Ready after asynchronous account validation so a stale success action cannot create a draft", async () => {
    await mount(); await renderer.act(async () => form().onSubmit());
    const pendingCheck = deferred<boolean>(); mockSame.mockReturnValueOnce(pendingCheck.promise);
    const action = tree.root.findByProps({ accessibilityLabel: "สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น" }).props.onPress;
    await renderer.act(async () => action());
    await renderer.act(async () => tree.unmount());
    await renderer.act(async () => pendingCheck.resolve(true));
    expect(eventDraft(mockSession!.identity.accountId, event.id).receipt).toBeDefined();
  });
});
