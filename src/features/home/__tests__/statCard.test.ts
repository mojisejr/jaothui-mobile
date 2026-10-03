import React from "react";
import { StatCard } from "@/components/StatCard";
import { createStatPresentation } from "../countUp";

// jest-expo already supplies this renderer; no app dependency is added for tests.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void) => void;
  create: (element: React.ReactElement) => {
    toJSON: () => unknown;
    update: (element: React.ReactElement) => void;
    unmount: () => void;
  };
};

function rendered(tree: { toJSON: () => unknown }) { return JSON.stringify(tree.toJSON()); }

describe("mounted native StatCard presentation", () => {
  let now: number;
  let frameId: number;
  let frames: Map<number, (timestamp: number) => void>;
  beforeEach(() => {
    now = 0; frameId = 0; frames = new Map();
    jest.spyOn(performance, "now").mockImplementation(() => now);
    jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => { frames.set(++frameId, callback); return frameId; });
    jest.spyOn(global, "cancelAnimationFrame").mockImplementation((id) => { frames.delete(id); });
  });
  afterEach(() => jest.restoreAllMocks());
  function advance(time: number) {
    renderer.act(() => {
      now = time; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(now));
    });
  }
  const base = { id: "buffalos", value: "1,344", count: 1344, label: "กระบือในฐานข้อมูล", unit: "ตัว", active: true, reduceMotion: false, glyphMetrics: { digit: 15, comma: 6 } };
  it("animates a normal ready first-success mount and does not prematurely reset per frame", () => {
    const presentation = createStatPresentation();
    let tree!: ReturnType<typeof renderer.create>;
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, presentation })); });
    expect(frames.size).toBe(1);
    expect(rendered(tree)).toContain('"accessibilityLabel":"กระบือในฐานข้อมูล, 1,344 ตัว"');
    advance(600);
    expect(rendered(tree)).toContain('"1,176"');
    expect(frames.size).toBe(1);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, presentation })));
    expect(rendered(tree)).toContain('"1,176"');
    advance(1200); expect(rendered(tree)).toContain('"1,344"'); expect(frames.size).toBe(0);
    renderer.act(() => tree.unmount());
  });
  it("starts on first offscreen reveal; cancellation settles and remount/focus never replays", () => {
    const presentation = createStatPresentation();
    let tree!: ReturnType<typeof renderer.create>;
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: false, presentation })); });
    expect(frames.size).toBe(0);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, presentation })));
    expect(frames.size).toBe(1); advance(200);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, active: false, presentation })));
    expect(frames.size).toBe(0); expect(rendered(tree)).toContain('"1,344"');
    renderer.act(() => tree.unmount());
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, presentation })); });
    expect(frames.size).toBe(0); expect(rendered(tree)).toContain('"1,344"');
    renderer.act(() => tree.unmount());
  });
  it("pending preference shown final never resets later; reduced-motion midrun settles", () => {
    let tree!: ReturnType<typeof renderer.create>;
    const presentation = createStatPresentation();
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, reduceMotion: null, presentation })); });
    expect(rendered(tree)).toContain('"1,344"');
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, presentation })));
    expect(frames.size).toBe(0);
    renderer.act(() => tree.unmount());
    const fresh = createStatPresentation();
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, presentation: fresh })); });
    advance(300);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, reduceMotion: true, presentation: fresh })));
    expect(rendered(tree)).toContain('"1,344"'); expect(frames.size).toBe(0);
    renderer.act(() => tree.unmount());
  });
  it("renders changed authoritative targets, zero, unavailable and old payloads without replay", () => {
    let tree!: ReturnType<typeof renderer.create>;
    const presentation = createStatPresentation();
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, presentation })); });
    advance(300);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, count: 12, value: "12", visible: true, presentation })));
    expect(rendered(tree)).toContain('"12"'); expect(frames.size).toBe(0);
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, count: 0, value: "0", visible: true, presentation })));
    expect(rendered(tree)).toContain('"0"');
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, count: null, value: "—", visible: true, presentation })));
    expect(rendered(tree)).toContain('"—"');
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, count: undefined, value: "legacy-final", visible: true, presentation })));
    expect(rendered(tree)).toContain('"legacy-final"'); expect(frames.size).toBe(0);
    renderer.act(() => tree.unmount());
  });
  it("late glyph preparation never resets an exposed final; zero and missing are static on fresh mounts", () => {
    let tree!: ReturnType<typeof renderer.create>;
    const presentation = createStatPresentation();
    renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, visible: true, glyphMetrics: null, presentation })); });
    expect(rendered(tree)).toContain('"1,344"');
    renderer.act(() => tree.update(React.createElement(StatCard, { ...base, visible: true, presentation })));
    expect(frames.size).toBe(0); expect(rendered(tree)).toContain('"1,344"');
    renderer.act(() => tree.unmount());
    for (const count of [0, null, undefined]) {
      renderer.act(() => { tree = renderer.create(React.createElement(StatCard, { ...base, count, value: count === 0 ? "0" : count === null ? "—" : "legacy", visible: true, presentation: createStatPresentation() })); });
      expect(frames.size).toBe(0);
      renderer.act(() => tree.unmount());
    }
  });
});
