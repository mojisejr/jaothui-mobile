import { countAt, createMotionPreference, createStatPresentation, formatStatCount, isStatCount, startStatCountUp, statNumberWidth, statsIntersectViewport, COUNT_UP_DURATION_MS } from "../countUp";

describe("authoritative Home counter contracts", () => {
  it("uses bounded fast-to-slow interpolation with an exact 1200ms finish", () => {
    expect(COUNT_UP_DURATION_MS).toBe(1200);
    expect(countAt(1344, -1)).toBe(0);
    expect(countAt(1344, 600)).toBe(1176);
    expect(countAt(1344, 1200)).toBe(1344);
    const frames = Array.from({ length: 76 }, (_, index) => countAt(1344, index * 16));
    expect(frames.every((n, i) => n <= 1344 && (i === 0 || n >= frames[i - 1]))).toBe(true);
    expect(countAt(1344, 300) - countAt(1344, 0)).toBeGreaterThan(countAt(1344, 1200) - countAt(1344, 900));
    expect(countAt(0, 600)).toBe(0);
  });
  it("never parses legacy formatted strings into numeric truth", () => {
    for (const invalid of [null, undefined, "1,344", -1, NaN, Infinity, 1.1, Number.MAX_SAFE_INTEGER + 1]) expect(isStatCount(invalid)).toBe(false);
    expect(isStatCount(0)).toBe(true);
    expect(formatStatCount(123456789012345)).toBe("123,456,789,012,345");
  });
  it("reserves every digit using the widest actual glyph, not the final narrow 1s", () => {
    expect(statNumberWidth("1,111", { digit: 20, comma: 4 })).toBe(86);
    expect(statNumberWidth("1,111", { digit: 20, comma: 4 })).toBeGreaterThan(4 * 8 + 4);
    expect(statNumberWidth("123,456,789,012,345", { digit: 20, comma: 4 })).toBe(318);
  });
  it("requires actual viewport intersection and excludes a covered bottom area", () => {
    expect(statsIntersectViewport(null, { offset: 0, height: 600 })).toBeNull();
    expect(statsIntersectViewport({ y: 600, height: 200 }, { offset: 0, height: 600 })).toBe(false);
    expect(statsIntersectViewport({ y: 600, height: 200 }, { offset: 1, height: 600 })).toBe(true);
    expect(statsIntersectViewport({ y: 600, height: 200 }, { offset: 801, height: 600 })).toBe(false);
  });
  it("keeps consumption outside a card remount/retry and only resets for a new Home", () => {
    const home = createStatPresentation();
    expect(home.consume("buffalos")).toBe(true);
    expect(home.consume("buffalos")).toBe(false);
    expect(home.has("buffalos")).toBe(true);
    expect(home.consume("events")).toBe(true);
    expect(createStatPresentation().consume("buffalos")).toBe(true);
  });
  it("subscribed preference events beat late initial queries; fail safe and dispose", () => {
    const values: boolean[] = [];
    const preference = createMotionPreference((value) => values.push(value));
    preference.event(true);
    preference.initial(false);
    preference.fail();
    expect(values).toEqual([true]);
    preference.event(false);
    preference.dispose();
    preference.initial(true);
    preference.event(true);
    expect(values).toEqual([true, false]);
    const fail = jest.fn();
    createMotionPreference(fail).fail();
    expect(fail).toHaveBeenCalledWith(true);
  });
  it("runs on a controllable frame clock, settles on cancellation, never resumes", () => {
    let time = 0;
    let nextId = 0;
    const pending = new Map<number, (timestamp: number) => void>();
    const clock = {
      now: () => time,
      request: (callback: (timestamp: number) => void) => { pending.set(++nextId, callback); return nextId; },
      cancel: (id: number) => { pending.delete(id); },
    };
    const values: number[] = [];
    const stop = startStatCountUp(1344, (value) => values.push(value), clock);
    const advance = (timestamp: number) => {
      time = timestamp;
      const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach((callback) => callback(time));
    };
    expect(values).toEqual([0]);
    advance(600); expect(values.at(-1)).toBe(1176);
    advance(1200); expect(values.at(-1)).toBe(1344); expect(pending.size).toBe(0);
    stop(); expect(values.filter((value) => value === 1344)).toHaveLength(1);
    time = 0;
    const stopEarly = startStatCountUp(15, (value) => values.push(value), clock);
    advance(200); stopEarly(); expect(values.at(-1)).toBe(15); expect(pending.size).toBe(0);
    const calls = values.length; advance(1500); expect(values).toHaveLength(calls);
  });
});
