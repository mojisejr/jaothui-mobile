import React from "react";
import { Modal } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ApplicantQrPanel } from "../ApplicantQrPanel";
import { useRegistrationResource } from "../useRegistrationResource";
import { registration } from "./fixtures";
let mockResource: Record<string, unknown>;
jest.mock("../useRegistrationResource", () => ({ useRegistrationResource: jest.fn(() => mockResource) }));
jest.mock("../CustomerGate", () => ({ CustomerGate: () => null }));
jest.mock("react-native-qrcode-svg", () => ({ __esModule: true, default: () => null }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (fn: () => void) => void; create: (node: React.ReactElement) => { root: { findByType: (type: unknown) => { props: Record<string, unknown> }; findAllByType: (type: unknown) => unknown[] }; update: (node: React.ReactElement) => void; toJSON: () => unknown; unmount: () => void } };
describe("native applicant-only QR panel", () => {
  let tree: ReturnType<typeof renderer.create>;
  const onClose = jest.fn(), onUpdated = jest.fn();
  const next = (changes = {}) => ({ ...registration, registrationStatus: "registered" as const, checkInVersion: 1 as const, checkInStatus: "not_checked_in" as const, qrAvailable: true, checkInEligibility: { eligible: false, reason: "ยังไม่ถึงวันเปิดรายงานตัว" }, ...changes });
  const mount = () => { renderer.act(() => { tree = renderer.create(React.createElement(ApplicantQrPanel, { application: next(), onClose, onUpdated })); }); };
  beforeEach(() => { jest.clearAllMocks(); mockResource = { data: { value: { registration: next(), qrUrl: "https://dboard.jaothui.com/dashboard/competitions/check-in/synthetic" } }, error: null, reload: jest.fn(), updatedAt: "2026-11-01T01:00:00Z", refreshing: false }; });
  afterEach(() => renderer.act(() => tree?.unmount()));
  it("shows source QR before event start with class identity, white quiet zone and explicit dismiss", () => {
    mount();
    const qr = tree.root.findByType(QRCode).props;
    expect(qr).toMatchObject({ value: "https://dboard.jaothui.com/dashboard/competitions/check-in/synthetic", quietZone: 24, color: "#000000", backgroundColor: "#ffffff", ecl: "M" });
    const content = JSON.stringify(tree.toJSON());
    expect(content).toContain(registration.buffalo.name); expect(content).toContain(registration.buffalo.type);
    expect(content).toContain("ยังไม่ถึงวันเปิดรายงานตัว"); expect(content).toContain("ยังไม่รายงานตัว");
    expect(content).not.toContain('"accessibilityLabel":"ยืนยันรายงานตัว"');
    renderer.act(() => (tree.root.findByType(Modal).props.onRequestClose as () => void)()); expect(onClose).toHaveBeenCalledTimes(1);
    expect(useRegistrationResource).toHaveBeenCalledWith(expect.any(Function), 10000);
  });
  it("hides a cached QR after refresh failure and labels cached status stale", () => {
    mockResource.error = new Error("offline"); mount();
    expect(tree.root.findAllByType(QRCode)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain("อาจยังไม่เป็นปัจจุบัน");
  });
  it("shows arrival/time after the QR window closes without recreating a QR or exposing staff actions", () => {
    mockResource.data = { value: { registration: next({ checkInStatus: "checked_in", checkedInAt: "2026-11-01T01:00:00Z", qrAvailable: false }), qrUrl: "" } }; mount();
    expect(tree.root.findAllByType(QRCode)).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain("รายงานตัวแล้ว"); expect(JSON.stringify(tree.toJSON())).toContain("08:00");
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });
});
