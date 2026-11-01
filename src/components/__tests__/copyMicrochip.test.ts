import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Clipboard from "expo-clipboard";
import { CopyMicrochip } from "../CopyMicrochip";
import { colors, spacing } from "@/design/tokens";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
// jest-expo supplies the mounted native renderer used by the existing suites.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => {
    root: TestNode;
    update: (element: React.ReactElement) => void;
    unmount: () => void;
  };
};
type TestNode = {
  props: {
    onPress: () => Promise<void>;
    style: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
    children: unknown;
    disabled?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityHint?: string;
    accessibilityState?: { busy: boolean; disabled: boolean };
    accessibilityValue?: { text: string };
    numberOfLines?: number;
    maxFontSizeMultiplier?: number;
  };
  findByType: (type: unknown) => TestNode;
  findAll: (predicate: (node: TestNode) => boolean) => TestNode[];
  findAllByType: (type: unknown) => TestNode[];
  findByProps: (props: Record<string, unknown>) => TestNode;
};
function deferred() {
  let resolve!: (value: boolean) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<boolean>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("mounted native CopyMicrochip", () => {
  let tree: ReturnType<typeof renderer.create>;
  const write = jest.mocked(Clipboard.setStringAsync);
  const render = (microchip?: string | null, identity?: string) => React.createElement(CopyMicrochip, { microchip, identity });
  function mount(microchip?: string | null, identity?: string) {
    renderer.act(() => { tree = renderer.create(render(microchip, identity)); });
  }
  const button = () => tree.root.findByProps({ accessibilityRole: "button" });
  const status = () => button().props.accessibilityValue?.text;
  async function press() { await renderer.act(async () => { await button().props.onPress(); }); }
  const feedbackTimers = () => jest.mocked(setTimeout).mock.calls.filter(([, delay]) => delay === 1800);
  const firstFeedbackTimer = () => jest.mocked(setTimeout).mock.results[jest.mocked(setTimeout).mock.calls.findIndex(([, delay]) => delay === 1800)].value;
  beforeEach(() => { jest.useFakeTimers(); jest.spyOn(globalThis, "setTimeout"); jest.spyOn(globalThis, "clearTimeout"); write.mockReset().mockResolvedValue(true); });
  afterEach(() => { renderer.act(() => tree?.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

  it.each(["000012345678901", " 000ABC-12 ", "0", "chip/with-symbols"])("writes the exact source string only after press: %s", async (microchip) => {
    mount(microchip);
    expect(write).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ children: microchip })).toBeDefined();
    expect(button().props.accessibilityLabel).toBe(`คัดลอกไมโครชิป ${microchip}`);
    await press();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(microchip);
    expect(status()).toBe("คัดลอกแล้ว");
    renderer.act(() => jest.advanceTimersByTime(1799));
    expect(status()).toBe("คัดลอกแล้ว");
    renderer.act(() => jest.advanceTimersByTime(1));
    expect(status()).toBe("แตะเพื่อคัดลอก");
  });

  it.each([undefined, null, "", " \t\n ", "N/A", " n/a "])("offers no copy action for unavailable %s", (microchip) => {
    mount(microchip);
    expect(tree.root.findAll((node) => node.props.accessibilityRole === "button")).toHaveLength(0);
    renderer.act(() => jest.runOnlyPendingTimers());
    expect(write).not.toHaveBeenCalled();
  });

  it("locks rapid presses synchronously and reports success only after the native promise resolves", async () => {
    const pending = deferred(); write.mockReturnValue(pending.promise);
    mount("00001");
    const onPress = button().props.onPress;
    renderer.act(() => { void onPress(); void onPress(); void onPress(); });
    expect(write).toHaveBeenCalledTimes(1);
    expect(status()).toBe("กำลังคัดลอก…");
    expect(button().props).toMatchObject({ disabled: true, accessibilityState: { busy: true, disabled: true } });
    renderer.act(() => jest.advanceTimersByTime(10000));
    expect(status()).toBe("กำลังคัดลอก…");
    await renderer.act(async () => { pending.resolve(true); await pending.promise; });
    expect(status()).toBe("คัดลอกแล้ว");
    expect(button().props).toMatchObject({ disabled: false, accessibilityState: { busy: false, disabled: false } });
  });

  it.each(["false", "reject"])("never claims success on %s and permits an explicit retry", async (failure) => {
    if (failure === "false") write.mockResolvedValueOnce(false);
    else write.mockRejectedValueOnce(new Error("native unavailable"));
    mount("00001");
    await press();
    expect(status()).toBe("คัดลอกไม่สำเร็จ");
    expect(button().props.accessibilityHint).toContain("ลองคัดลอกอีกครั้ง");
    expect(button().props.disabled).toBe(false);
    await press();
    expect(write).toHaveBeenCalledTimes(2);
    expect(status()).toBe("คัดลอกแล้ว");
  });

  it("resets failure feedback after 1800ms without automatically writing again", async () => {
    write.mockResolvedValue(false); mount("00001"); await press();
    renderer.act(() => jest.advanceTimersByTime(1800));
    expect(status()).toBe("แตะเพื่อคัดลอก");
    expect(write).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])("a replaced chip ignores stale completion %s while the replacement can copy", async (result) => {
    const old = deferred(); write.mockReturnValueOnce(old.promise);
    mount("00001", "buffalo-a");
    renderer.act(() => { void button().props.onPress(); });
    renderer.act(() => tree.update(render("00002", "buffalo-a")));
    expect(status()).toBe("แตะเพื่อคัดลอก");
    await press();
    expect(status()).toBe("คัดลอกแล้ว");
    await renderer.act(async () => { old.resolve(result); await old.promise; });
    expect(status()).toBe("คัดลอกแล้ว");
    expect(write.mock.calls).toEqual([["00001"], ["00002"]]);
    expect(feedbackTimers()).toHaveLength(1);
  });

  it("identity replacement resets feedback even for an unchanged chip and cancels its timer", async () => {
    mount("00001", "buffalo-a"); await press();
    renderer.act(() => jest.advanceTimersByTime(1700));
    renderer.act(() => tree.update(render("00001", "buffalo-b")));
    expect(status()).toBe("แตะเพื่อคัดลอก");
    expect(clearTimeout).toHaveBeenCalledWith(firstFeedbackTimer());
    await press();
    renderer.act(() => jest.advanceTimersByTime(100));
    expect(status()).toBe("คัดลอกแล้ว");
  });

  it("an unavailable replacement discards a pending rejection and cannot leave feedback timers", async () => {
    const old = deferred(); write.mockReturnValueOnce(old.promise); mount("00001");
    renderer.act(() => { void button().props.onPress(); });
    renderer.act(() => tree.update(render("N/A")));
    await renderer.act(async () => { old.reject(new Error("late error")); await Promise.resolve(); });
    expect(tree.root.findAll((node) => node.props.accessibilityRole === "button")).toHaveLength(0);
    expect(feedbackTimers()).toHaveLength(0);
  });

  it.each([true, false])("unmount ignores pending completion %s and schedules no feedback", async (result) => {
    const pending = deferred(); write.mockReturnValueOnce(pending.promise); mount("00001");
    const oldPress = button().props.onPress;
    renderer.act(() => { void oldPress(); tree.unmount(); });
    await renderer.act(async () => { pending.resolve(result); await pending.promise; await oldPress(); });
    expect(write).toHaveBeenCalledTimes(1);
    expect(feedbackTimers()).toHaveLength(0);
  });

  it("unmount cancels an already scheduled feedback reset", async () => {
    mount("00001"); await press(); expect(feedbackTimers()).toHaveLength(1);
    renderer.act(() => tree.unmount());
    expect(clearTimeout).toHaveBeenCalledWith(firstFeedbackTimer());
  });

  it("retains a growing 44px target and identical reserved layout through all feedback states", async () => {
    const pending = deferred(); write.mockReturnValueOnce(pending.promise); mount("0000123456789012345678901234567890");
    const style = () => {
      const value = button().props.style;
      return StyleSheet.flatten(typeof value === "function" ? value({ pressed: false }) : value);
    };
    const initial = style();
    expect(initial).toMatchObject({ minHeight: spacing.touchTarget, backgroundColor: colors.surface });
    expect(initial.height).toBeUndefined();
    const reserve = () => tree.root.findAllByType(Text).filter((node) => StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>)?.opacity === 0)[0];
    const reserved = reserve();
    const assertStable = () => {
      expect(style()).toEqual(initial);
      expect(reserve()).toBe(reserved);
      for (const node of tree.root.findAllByType(Text)) {
        expect(node.props.numberOfLines).toBeUndefined();
        expect(node.props.maxFontSizeMultiplier).toBeUndefined();
      }
    };
    renderer.act(() => { void button().props.onPress(); }); assertStable();
    await renderer.act(async () => { pending.resolve(false); await pending.promise; }); assertStable();
    await press(); assertStable();
    renderer.act(() => jest.advanceTimersByTime(1800)); assertStable();
  });

  it("keeps feedback independent between two mounted controls and survives StrictMode replay", async () => {
    renderer.act(() => { tree = renderer.create(React.createElement(React.StrictMode, null,
      React.createElement(View, null, render("00001"), render("00002")))); });
    await renderer.act(async () => { await tree.root.findByProps({ accessibilityLabel: "คัดลอกไมโครชิป 00001" }).props.onPress(); });
    expect(["00001", "00002"].map((chip) => tree.root.findByProps({ accessibilityLabel: `คัดลอกไมโครชิป ${chip}` }).props.accessibilityValue?.text)).toEqual(["คัดลอกแล้ว", "แตะเพื่อคัดลอก"]);
    expect(write.mock.calls).toEqual([["00001"]]);
  });
});
