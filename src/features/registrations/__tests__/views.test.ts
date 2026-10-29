import React from "react";
import { FlatList, Modal, TextInput } from "react-native";
import { RegistrationFormView, type RegistrationFormViewProps } from "../RegistrationFormView";
import { RegistrationDetailView } from "../RegistrationDetailView";
import { RegistrationHistoryView } from "../RegistrationHistoryView";
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
  it.each([false, true])("renders all sourceconsents unchecked with explicit positive choice (Royal=%s)", royal => {
    const p = props(royal); renderer.act(() => { tree = renderer.create(React.createElement(RegistrationFormView, p)); });
    for (const clause of agreementsFor(p.event)) {
      const checkbox = tree.root.findByProps({ accessibilityRole: "checkbox", accessibilityLabel: `ยินยอม: ${clause.text}` }); expect(checkbox.props.accessibilityState.checked).toBe(false);
      renderer.act(() => checkbox.props.onPress()); expect(p.onAgreement).toHaveBeenCalledWith(clause.key, true);
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
    const p = { items, filter: "all" as const, onFilter: jest.fn(), onOpen: jest.fn(), onMore: jest.fn(), hasMore: false, loadingMore: false };
    renderer.act(() => { tree = renderer.create(React.createElement(RegistrationHistoryView, p)); }); expect(tree.root.findByType(FlatList).props.data).toHaveLength(4);
    renderer.act(() => tree.update(React.createElement(RegistrationHistoryView, { ...p, filter: "pending" }))); expect(tree.root.findByType(FlatList).props.data).toHaveLength(1);
    renderer.act(() => tree.update(React.createElement(RegistrationDetailView, { registration: { ...registration, status: "rejected", approvalComment: "กรุณาตรวจสอบเอกสาร" } }))); expect(JSON.stringify(tree.toJSON())).toContain("ไม่ผ่านการพิจารณา"); expect(JSON.stringify(tree.toJSON())).not.toContain("อยู่ระหว่างพิจารณา");
    renderer.act(() => tree.update(React.createElement(RegistrationDetailView, { registration: { ...registration, status: "pending" }, receipt: true, replayed: true }))); expect(JSON.stringify(tree.toJSON())).toContain("ไม่มีการสมัครซ้ำ"); expect(JSON.stringify(tree.toJSON())).toContain("รอพิจารณา");
  });
});
