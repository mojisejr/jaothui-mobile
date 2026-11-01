import React from "react";
import { NormalLevelSelector } from "../NormalLevelSelector";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (fn: () => void) => void;
  create: (node: React.ReactElement) => { root: { findByProps: (props: Record<string, unknown>) => { props: { onPress: () => void; disabled: boolean; accessibilityState: { checked: boolean } } } }; toJSON: () => unknown; unmount: () => void };
};
const options = { nationalTypes: ["ควายหนุ่ม–สาว 24–36 เดือน"], provinceTypes: [], specialNationalTypes: ["[SP] ควายแคระ"], specialProvinceTypes: [] };
describe("competition level availability and explicit selection", () => {
  let tree: ReturnType<typeof renderer.create>;
  afterEach(() => renderer.act(() => tree?.unmount()));
  it("shows eligible counts and lets an empty province explicitly switch to country", () => {
    const onChange = jest.fn();
    renderer.act(() => { tree = renderer.create(React.createElement(NormalLevelSelector, { options, level: "จังหวัด", age: 32, disabled: false, onChange })); });
    const content = JSON.stringify(tree.toJSON());
    expect(content).toContain("รุ่นตามอายุ 1 · รุ่นพิเศษ 1"); expect(content).toContain("ไม่มีรุ่นที่ตรงกับอายุ 32 เดือน");
    expect(tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: "ระดับจังหวัด / ท้องถิ่น" }).props.accessibilityState.checked).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    renderer.act(() => tree.root.findByProps({ accessibilityRole: "button", accessibilityLabel: "ดูรุ่นระดับประเทศ" }).props.onPress());
    expect(onChange).toHaveBeenCalledWith("ประเทศ");
  });
  it("does not claim no matching classes before a valid birthday is known", () => {
    renderer.act(() => { tree = renderer.create(React.createElement(NormalLevelSelector, { options: { ...options, nationalTypes: [], specialNationalTypes: [] }, level: "จังหวัด", age: null, disabled: false, onChange: jest.fn() })); });
    const content = JSON.stringify(tree.toJSON());
    expect(content).toContain("เลือกวันเกิดเพื่อดูรุ่นแข่งขัน"); expect(content).not.toContain("ไม่มีรุ่นที่ตรง"); expect(content).not.toContain("ดูรุ่นระดับประเทศ");
  });
  it("retains a level with eligible special classes and locks every selection during a frozen request", () => {
    renderer.act(() => { tree = renderer.create(React.createElement(NormalLevelSelector, { options: { ...options, specialProvinceTypes: ["[SP] รุ่นพิเศษท้องถิ่น"] }, level: "จังหวัด", age: 32, disabled: true, onChange: jest.fn() })); });
    expect(JSON.stringify(tree.toJSON())).toContain("รุ่นตามอายุ 0 · รุ่นพิเศษ 1");
    expect(JSON.stringify(tree.toJSON())).not.toContain("ดูรุ่นระดับประเทศ");
    for (const label of ["ระดับประเทศ", "ระดับจังหวัด / ท้องถิ่น"]) expect(tree.root.findByProps({ accessibilityRole: "radio", accessibilityLabel: label }).props.disabled).toBe(true);
  });
});
