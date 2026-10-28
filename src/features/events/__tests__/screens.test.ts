import React from "react";
import { AccessibilityInfo, FlatList, TextInput } from "react-native";
import { HomeEventZone } from "../HomeEventZone";
import { EventDetailScreen } from "../EventDetailScreen";
import { EventListScreen } from "../EventListScreen";
import { MobileApiError } from "@/api/client";
import type { EventDetail, EventList, EventSummary } from "@/types/events";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => { root: TestNode; toJSON: () => unknown; update: (element: React.ReactElement) => void; unmount: () => void };
};
type TestNode = { props: { accessibilityLabel: string; accessibilityState: { selected: boolean }; onPress: () => void; onChangeText: (value: string) => void; data: EventSummary[]; label: string }; findByType: (type: unknown) => TestNode; findAllByType: (type: unknown) => TestNode[]; findByProps: (props: Record<string, unknown>) => TestNode };
const mockPush = jest.fn(), mockReplace = jest.fn(), mockReload = jest.fn(), mockGet = jest.fn(), mockDetail = jest.fn(), mockMember = jest.fn();
let mockResource: Record<string, unknown>;
let mockEnvironment = { active: true, reduceMotion: false as boolean | null };
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useLocalSearchParams: () => ({ eventId: "event-0" }) }));
jest.mock("../useEventResource", () => ({ useEventResource: () => ({ ...mockResource, reload: mockReload }) }));
jest.mock("../../home/useStatEnvironment", () => ({ useStatEnvironment: () => mockEnvironment }));
jest.mock("@/api/events", () => ({ getOpenEvents: (...args: unknown[]) => mockGet(...args), getEventDetail: (...args: unknown[]) => mockDetail(...args), getEventMember: (...args: unknown[]) => mockMember(...args) }));
jest.mock("@/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/auth/lineAccount", () => ({ openLineAccountAuthSession: jest.fn() }));
jest.mock("@/auth/eventLineLink", () => ({ openEventLineLink: jest.fn() }));
jest.mock("@/auth/sessionStorage", () => ({ ...jest.requireActual("@/auth/sessionStorage"), loadMobileSession: jest.fn(async () => null), clearMobileSession: jest.fn() }));
const event = (id: number): EventSummary => ({ id: `event-${id}`, name: `ประกวดกระบือ ${id}`, eventType: "normal", imageUrl: null, competitionStartDay: "2026-10-29", competitionEndDay: "2026-10-31", registrationStartDay: null, registrationDeadline: null, publicRegistration: "open", location: null });
const detail = (open = true): EventDetail => ({ ...event(0), description: null, metadata: [], ageCutoffDay: null, formKind: "normal", catalogs: [], policy: { lifecycle: "published", publicVisible: true, publicRegistration: open ? "open" : "closed-manual", warnings: [] } });
const payload = (count: number): EventList => ({ items: Array.from({ length: Math.min(count, 5) }, (_, i) => event(i)), totalOpen: count, nextCursor: null, observedAt: "2026-10-28T00:00:00Z" });
describe("mounted RN event discovery", () => {
  let tree: ReturnType<typeof renderer.create>;
  beforeEach(() => { jest.useFakeTimers(); mockEnvironment = { active: true, reduceMotion: false }; jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(false); mockPush.mockClear(); mockReplace.mockClear(); mockGet.mockReset(); mockDetail.mockReset(); mockResource = { status: "success", data: payload(0) }; });
  afterEach(() => { if (tree) renderer.act(() => tree.unmount()); jest.useRealTimers(); jest.restoreAllMocks(); });
  async function mount(element: React.ReactElement) { await renderer.act(async () => { tree = renderer.create(element); }); }
  const button = (label: string) => tree.root.findByProps({ accessibilityLabel: label, accessibilityRole: "button" });
  it.each([0, 1, 5, 6, 7])("renders count%i with correct View All and no empty zone", async count => {
    mockResource = { status: "success", data: payload(count) }; await mount(React.createElement(HomeEventZone, { visible: true, onLayout: jest.fn() }));
    if (!count) { expect(tree.toJSON()).toBeNull(); return; }
    expect(tree.root.findByType(FlatList).props.data).toHaveLength(Math.min(count, 5));
    expect(JSON.stringify(tree.toJSON()).includes("ดูทั้งหมด")).toBe(count > 5);
    for (let i = 1; i <= Math.min(count, 5); i++) expect(button(`กิจกรรม ${i} จาก ${Math.min(count, 5)}`)).toBeTruthy();
    if (count === 1) { renderer.act(() => { jest.advanceTimersByTime(20000); }); expect(button("กิจกรรม 1 จาก 1").props.accessibilityState.selected).toBe(true); }
  });
  it("advances only while allowed, pauses manually and retains selected ID on refresh", async () => {
    mockResource = { status: "success", data: payload(5) }; await mount(React.createElement(HomeEventZone, { visible: true, onLayout: jest.fn() }));
    renderer.act(() => { jest.advanceTimersByTime(5500); }); expect(button("กิจกรรม 2 จาก 5").props.accessibilityState.selected).toBe(true);
    renderer.act(() => { button("พักสไลด์อัตโนมัติ").props.onPress(); }); renderer.act(() => { jest.advanceTimersByTime(11000); }); expect(button("กิจกรรม 2 จาก 5").props.accessibilityState.selected).toBe(true);
    mockResource = { status: "loading", data: null }; await renderer.act(async () => tree.update(React.createElement(HomeEventZone, { visible: true, onLayout: jest.fn() })));
    mockResource = { status: "success", data: { ...payload(5), items: [event(4), event(3), event(2), event(1), event(0)] } }; await renderer.act(async () => tree.update(React.createElement(HomeEventZone, { visible: true, onLayout: jest.fn() })));
    expect(button("กิจกรรม 4 จาก 5").props.accessibilityState.selected).toBe(true);
  });
  it("never auto-navigates when offscreen, backgrounded or motion preference unknown", async () => {
    mockEnvironment = { active: false, reduceMotion: null }; mockResource = { status: "success", data: payload(5) }; await mount(React.createElement(HomeEventZone, { visible: false, onLayout: jest.fn() }));
    renderer.act(() => { jest.advanceTimersByTime(22000); }); expect(button("กิจกรรม 1 จาก 5").props.accessibilityState.selected).toBe(true); expect(mockPush).not.toHaveBeenCalled();
  });
  it("distinguishes closed and not-found detail and rechecks closure on Apply", async () => {
    mockResource = { status: "success", data: detail(false) }; await mount(React.createElement(EventDetailScreen));
    expect(JSON.stringify(tree.toJSON())).toContain("กิจกรรมนี้ไม่เปิดรับสมัครในขณะนี้");
    mockResource = { status: "error", error: new MobileApiError("not found", "EVENT_NOT_FOUND", 404) }; await renderer.act(async () => tree.update(React.createElement(EventDetailScreen)));
    expect(JSON.stringify(tree.toJSON())).toContain("ไม่พบกิจกรรมนี้");
    mockResource = { status: "success", data: detail() }; mockDetail.mockResolvedValue(detail(false)); await renderer.act(async () => tree.update(React.createElement(EventDetailScreen)));
    const apply = tree.root.findByProps({ accessibilityLabel: "สมัครประกวด" });
    await renderer.act(async () => { apply.props.onPress(); });
    expect(JSON.stringify(tree.toJSON())).toContain("กิจกรรมนี้ปิดรับสมัครแล้ว"); expect(mockMember).not.toHaveBeenCalled(); expect(mockPush).not.toHaveBeenCalled();
  });
  it("discards an old search response immediately when query text changes", async () => {
    let oldResolve!: (result: EventList) => void;
    mockGet.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; })).mockResolvedValueOnce({ ...payload(1), items: [{ ...event(8), name: "ผลค้นหาใหม่" }] });
    await mount(React.createElement(EventListScreen));
    await renderer.act(async () => { tree.root.findByType(TextInput).props.onChangeText("ใหม่"); });
    await renderer.act(async () => { oldResolve(payload(5)); }); expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
    await renderer.act(async () => { jest.advanceTimersByTime(300); });
    expect(mockGet.mock.calls[1][0].q).toBe("ใหม่"); expect(tree.root.findByType(FlatList).props.data[0].name).toBe("ผลค้นหาใหม่");
  });
});
