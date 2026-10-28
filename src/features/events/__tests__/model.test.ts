import { homeEventItems, stableEventIndex, shouldAutoplay, parseCalendarInput, formatCalendarInput, createLatestRequestGate } from "../model";
import { eventQueryString } from "@/api/events";
import type { EventSummary } from "@/types/events";
const event = (id: number, open = true): EventSummary => ({ id: `event-${id}`, name: `งาน ${id}`, eventType: "normal", imageUrl: null, competitionStartDay: "2026-10-29", competitionEndDay: "2026-10-31", registrationStartDay: null, registrationDeadline: null, publicRegistration: open ? "open" : "closed-manual", location: null });
describe("event discovery policies", () => {
  it.each([0, 1, 5, 6, 7])("bounds %i open previews independently from totalOpen", count => {
    const source = Array.from({ length: count }, (_, i) => event(i));
    expect(homeEventItems([...source, event(100, false)]).map(item => item.id)).toEqual(source.slice(0, 5).map(item => item.id));
  });
  it("retains selected ID across refresh reorder and clamps removed selection", () => {
    expect(stableEventIndex([event(3), event(1), event(2)], "event-2", 1)).toBe(2);
    expect(stableEventIndex([event(3)], "event-2", 4)).toBe(0); expect(stableEventIndex([], null, 4)).toBe(0);
  });
  const allowed = { count: 5, visible: true, active: true, interacting: false, paused: false, reduceMotion: false, screenReader: false };
  it("requires every visibility/lifecycle/accessibility permission for autoplay", () => {
    expect(shouldAutoplay(allowed)).toBe(true);
    for (const denied of [{ count: 0 }, { count: 1 }, { visible: false }, { active: false }, { interacting: true }, { paused: true }, { reduceMotion: true }, { reduceMotion: null }, { screenReader: true }, { screenReader: null }]) expect(shouldAutoplay({ ...allowed, ...denied })).toBe(false);
  });
  it("validates actual Thai/Gregorian calendar days without UTC date drift", () => {
    expect(parseCalendarInput("๒๙/๑๐/๒๕๖๙")).toEqual({ day: "2026-10-29" }); expect(parseCalendarInput("29/02/2024")).toEqual({ day: "2024-02-29" });
    for (const bad of ["29/02/2569", "31/04/2569", "00/12/2569", "2026-10-29"]) expect(parseCalendarInput(bad).error).toBeTruthy();
    expect(formatCalendarInput("๒๙๑๐๒๕๖๙")).toBe("29/10/2569");
  });
  it("forwards inclusive overlap bounds and encodes search/cursor without local date guessing", () => {
    const params = new URLSearchParams(eventQueryString({ q: "งานใหญ่ & ดี", from: "2026-10-29", to: "2026-10-31", cursor: "next+cursor", limit: 5 }));
    expect(Object.fromEntries(params)).toEqual({ q: "งานใหญ่ & ดี", from: "2026-10-29", to: "2026-10-31", cursor: "next+cursor", limit: "5" });
  });
  it("invalidates stale search and unmounted resource requests", () => {
    const gate = createLatestRequestGate(), first = gate.start(), second = gate.start(); expect(gate.current(first)).toBe(false); expect(gate.current(second)).toBe(true); gate.invalidate(); expect(gate.current(second)).toBe(false);
  });
});
