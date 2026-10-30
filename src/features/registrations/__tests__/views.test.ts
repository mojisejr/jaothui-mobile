import React from "react";
import { encodeCompetitionClass } from "../competitionClasses";
import { FlatList, Modal, TextInput } from "react-native";
import { RegistrationFormView, type RegistrationFormViewProps } from "../RegistrationFormView";
import { RegistrationDetailView } from "../RegistrationDetailView";
import { RegistrationHistoryView } from "../RegistrationHistoryView";
import { FormSelect } from "../FormControls";
import { ThaiBirthdayPicker } from "../ThaiBirthdayPicker";
import { agreementsFor } from "../model";
import { emptyPhotos, photoTitles } from "../photos";
import { normalEvent, royalEvent, filledFields, registration } from "./fixtures";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => { root: TestNode; toJSON: () => unknown; update: (element: React.ReactElement) => void; unmount: () => void };
};
type TestNode = { props: { accessibilityState: { checked: boolean; disabled: boolean }; onPress: () => void; onRequestClose: () => void; visible: boolean; editable: boolean; data: unknown[] }; findByProps: (props: Record<string, unknown>) => TestNode; findByType: (type: unknown) => TestNode; findAllByType: (type: unknown) => TestNode[] };
const props = (royal = false): RegistrationFormViewProps => ({ event: royal ? royalEvent : normalEvent, value: { ...filledFields }, agreements: {}, photos: emptyPhotos(), busy: false, lookupBusy: false, onChange: jest.fn(), onAgreement: jest.fn(), onPhoto: jest.fn(), onRemovePhoto: jest.fn(), onRetryPhoto: jest.fn(), onLookup: jest.fn(), onSubmit: jest.fn(), onEditRejected: jest.fn(), onRefresh: jest.fn() });
describe("mounted source-derived forms and own history presentation", () => {
  let tree: ReturnType<typeof renderer.create>;
  afterEach(() => renderer.act(() => tree?.unmount()));
  it("renders the reported 32-month buffalo with the structured 24–36 month division", () => {
    const p = props();
    const name = "ควายหนุ่ม–สาว อายุมากกว่า 24–36 เดือน";
    p.event = { ...p.event, ageCutoffDay: "2026-11-23", catalogs: [{ level: "ประเทศ", labels: [encodeCompetitionClass({ name, kind: "age", minMonths: 24, maxMonths: 36, minInclusive: false, group: "ควายสวยงาม", criteria: "" })] }] };
    p.value = { ...p.value, birthdayInput: "15/04/2567", type: "", level: "ประเทศ" };
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    expect(JSON.stringify(tree.toJSON())).toContain("ระดับประเทศ");
    expect(JSON.stringify(tree.toJSON())).toContain(name);
    expect(JSON.stringify(tree.toJSON())).not.toContain("ยังไม่มีรุ่นปกติที่ตรงกับข้อมูล");
  });
  it("shows normal age and eligible groups immediately after a manual DOB without sex/color", () => {
    const p = props(); p.value = { ...p.value, color: "", sex: "" };
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    const content = JSON.stringify(tree.toJSON());
    expect(content).toContain("อายุประกวด 36 เดือน"); expect(content).toContain("รุ่นตามอายุ (1)"); expect(content).toContain("รุ่นพิเศษ (1)");
  });
  it("shows normal levels and regular/SP groups together, retaining open chip/name input and locked controls", () => {
    const p = props();
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    const content = JSON.stringify(tree.toJSON());
    for (const label of ["ระดับประเทศ", "ระดับจังหวัด / ท้องถิ่น", "รุ่นตามอายุ (1)", "รุ่นพิเศษ (1)", "แม่ลูก"]) expect(content).toContain(label);
    expect(content).not.toContain('"accessibilityLabel":"เลือกรุ่นพิเศษ"');
    expect(tree.root.findByProps({ accessibilityLabel: "ไมโครชิป / ชื่อกระบือ" }).props.editable).toBe(true);
    renderer.act(() => tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: "ระดับประเทศ" }).props.onPress());
    expect(p.onChange).toHaveBeenCalledWith({ ...p.value, level: "ประเทศ" });
    renderer.act(() => tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: "รุ่นพิเศษ: [SP] แม่ลูก" }).props.onPress());
    expect(p.onChange).toHaveBeenCalledWith({ ...p.value, type: "[SP] แม่ลูก" });
    renderer.act(() => tree.update(React.createElement(RegistrationFormView, { ...p, pending: "uncertain" })));
    expect(tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: "ระดับประเทศ" }).props.accessibilityState.disabled).toBe(true);
  });
  it.each([false, true])("renders all sourceconsents unchecked with explicit positive choice (Royal=%s)", royal => {
    const p = props(royal); renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    for (const clause of agreementsFor(p.event)) {
      const checkbox = tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: `ยินยอม: ${clause.text}` }); expect(checkbox.props.accessibilityState.checked).toBe(false);
      renderer.act(() => checkbox.props.onPress()); expect(p.onAgreement).toHaveBeenCalledWith(clause.key, true);
      const no = tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: `ไม่ยินยอม: ${clause.text}` });
      renderer.act(() => no.props.onPress()); expect(p.onAgreement).toHaveBeenCalledWith(clause.key, false);
    }
    expect(p.onSubmit).not.toHaveBeenCalled();
  });
  it("keeps fixed five Royalslots/previews/errors and freezes edits during uncertain submission", () => {
    const p = props(true); p.photos[0] = { uri: "file:///proof.jpg", status: "error", error: "อัปโหลดไม่สำเร็จ" }; p.pending = "uncertain";
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    expect(tree.root.findByProps({ accessibilityLabel: photoTitles[0] })).toBeDefined();
    expect(JSON.stringify(tree.toJSON())).toContain("อัปโหลดไม่สำเร็จ"); expect(tree.root.findAllByType(TextInput).every(node => node.props.editable === false)).toBe(true);
    expect(tree.root.findByProps({ accessibilityLabel: "ตรวจสอบคำขอเดิมอีกครั้ง" })).toBeDefined();
    for (let i = 1; i <= 5; i++) expect(tree.root.findByProps({ accessibilityLabel: `${i === 1 ? "เปลี่ยนภาพ" : "เลือกภาพ"} ${i}` })).toBeDefined();
  });
  it("Royal uses canonical address selectors, clearing stale children, and only combined eligible classes", () => {
    const p = props(true); renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    const selects = tree.root.findAllByType(FormSelect);
    const province = selects.find(node => (node.props as unknown as { label: string }).label === "จังหวัด")!;
    (province.props as unknown as { onChange: (s: string) => void }).onChange("กระบี่");
    expect(p.onChange).toHaveBeenCalledWith(expect.objectContaining({ province: "กระบี่", amphoe: "", district: "" }));
    expect(JSON.stringify(tree.toJSON())).toContain("ตัวอย่างภาพประจำตัวสัตว์");
    expect(JSON.stringify(tree.toJSON())).not.toContain("เลือกรุ่นเอง");
  });
  it("opens date options without typing, and cancel/Android Back preserve the committed draft", () => {
    const onChange = jest.fn();
    renderer.act(() => { tree = renderer.create(React.createElement(ThaiBirthdayPicker, { value: "29/02/2567", onChange })); });
    expect(tree.root.findAllByType(TextInput)).toHaveLength(0);
    renderer.act(() => tree.root.findByProps({ accessibilityLabel: "เลือกเดือน" }).props.onPress());
    expect(tree.root.findByType(Modal).props.visible).toBe(true);
    renderer.act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(tree.root.findByType(Modal).props.visible).toBe(false); expect(onChange).not.toHaveBeenCalled();
    renderer.act(() => tree.root.findByProps({ accessibilityLabel: "เลือกปี พ.ศ." }).props.onPress());
    renderer.act(() => tree.root.findByProps({ accessibilityLabel: "2566" }).props.onPress());
    expect(onChange).toHaveBeenCalledWith("/02/2566");
    renderer.act(() => tree.root.findByProps({ accessibilityLabel: "เลือกวัน" }).props.onPress());
    renderer.act(() => tree.root.findByProps({ accessibilityLabel: "ยกเลิก" }).props.onPress());
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("renders ended own history and distinct normal/pending/approved/rejected filters", () => {
    const items = (["registered", "pending", "approved", "rejected"] as const).map((status, i) => ({ ...registration, id: `history-${i}`, status }));
    const p = { items, period: "all" as const, filter: "all" as const, onFilter: jest.fn(), onOpen: jest.fn(), onMore: jest.fn(), hasMore: false, loadingMore: false };
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationHistoryView, p)); }); expect(tree.root.findByType(FlatList).props.data).toHaveLength(4);
    renderer.act(() => tree.update(React.createElement(RegistrationHistoryView, { ...p, filter: "pending" }))); expect(tree.root.findByType(FlatList).props.data).toHaveLength(1);
    renderer.act(() => tree.update(React.createElement(RegistrationDetailView, { registration: { ...registration, status: "rejected", approvalComment: "กรุณาตรวจสอบเอกสาร" } }))); expect(JSON.stringify(tree.toJSON())).toContain("ไม่ผ่านการพิจารณา"); expect(JSON.stringify(tree.toJSON())).not.toContain("อยู่ระหว่างพิจารณา");
    renderer.act(() => tree.update(React.createElement(RegistrationDetailView, { registration: { ...registration, status: "pending" }, receipt: true, replayed: true }))); expect(JSON.stringify(tree.toJSON())).toContain("ไม่มีการสมัครซ้ำ"); expect(JSON.stringify(tree.toJSON())).toContain("รอพิจารณา");
  });
});
