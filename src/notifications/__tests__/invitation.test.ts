import React, { useEffect as mockUseEffect } from "react";
import { NotificationInvitation } from "../NotificationInvitation";
import { INVITATION_DISMISSAL_KEY } from "../invitationDismissal";
import type { MobileSession } from "@/types/mobile-api";
import { AppState } from "react-native";
const mockStatus = jest.fn(), mockEnable = jest.fn(), mockStore = new Map<string, string>();
let mockGeneration = 1;
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => (() => void)) => mockUseEffect(callback, [callback]) }));
jest.mock("expo-secure-store", () => ({ getItemAsync: async (key: string) => mockStore.get(key) ?? null, setItemAsync: async (key: string, value: string) => { mockStore.set(key, value); }, deleteItemAsync: async (key: string) => { mockStore.delete(key); } }));
jest.mock("@/auth/sessionLifecycle", () => ({ currentSessionGeneration: () => mockGeneration }));
jest.mock("../service", () => ({ notificationService: { status: (...args: unknown[]) => mockStatus(...args), enable: (...args: unknown[]) => mockEnable(...args) }, notificationAccount: (session: MobileSession) => session.identity.sessionVersion === 2 && ["line", "apple"].includes(session.identity.provider) ? session.identity.accountId : null }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (callback: () => void | Promise<void>) => Promise<void>; create: (element: React.ReactElement) => Tree };
type Tree = { root: { findByProps: (props: Record<string, unknown>) => { props: { onPress: () => void; disabled: boolean } }; findAllByProps: (props: Record<string, unknown>) => unknown[] }; update: (element: React.ReactElement) => void; unmount: () => void; toJSON: () => unknown };
const session = (accountId = "account-1") => ({ sessionToken: `session-${accountId}`, identity: { sessionVersion: 2, provider: "line", accountId } }) as MobileSession;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
describe("explicit notification invitation", () => {
  let tree: Tree | undefined;
  const mount = async (current = session()) => { await renderer.act(async () => { tree = renderer.create(React.createElement(NotificationInvitation, { session: current })); }); };
  const press = async (label: string) => { await renderer.act(async () => { tree!.root.findByProps({ accessibilityLabel: label }).props.onPress(); }); };
  const shown = () => tree!.toJSON() === null ? 0 : 1;
  beforeEach(() => { jest.resetAllMocks(); jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() }); mockStore.clear(); mockGeneration = 1; mockStatus.mockResolvedValue("disabled"); mockEnable.mockResolvedValue("enabled"); });
  afterEach(async () => { if (tree) await renderer.act(async () => { tree!.unmount(); }); tree = undefined; jest.restoreAllMocks(); });
  it("shows eligible disabled state with clear copy but never prompts on mount", async () => {
    await mount(); expect(shown()).toBe(1); expect(mockEnable).not.toHaveBeenCalled();
    expect(JSON.stringify(tree!.toJSON())).toContain("09:00"); expect(JSON.stringify(tree!.toJSON())).toContain("เข้าเกณฑ์");
    await press("เปิดแจ้งเตือนการแข่งขัน"); expect(mockEnable).toHaveBeenCalledTimes(1); expect(shown()).toBe(0);
  });
  it.each(["enabled", "blocked", "unavailable", "unsupported", "paused", "pending-disable", "loading", "saving", "error"])("does not invite or prompt when status is %s", async status => {
    mockStatus.mockResolvedValue(status); await mount(); expect(shown()).toBe(0); expect(mockEnable).not.toHaveBeenCalled();
  });
  it("does not nag after denied OS permission and never claims enabled", async () => {
    mockEnable.mockResolvedValue("blocked"); await mount(); await press("เปิดแจ้งเตือนการแข่งขัน"); expect(shown()).toBe(0);
    expect(JSON.stringify(tree!.toJSON())).not.toContain("เปิดแล้ว");
  });
  it("retains a retryable card after enable failure without pretending that permission/binding succeeded", async () => {
    mockEnable.mockRejectedValue(new Error("PUT unavailable")); await mount(); await press("เปิดแจ้งเตือนการแข่งขัน");
    expect(shown()).toBe(1); expect(JSON.stringify(tree!.toJSON())).toContain("ยังบันทึกไม่สำเร็จ"); expect(JSON.stringify(tree!.toJSON())).not.toContain("เปิดแล้ว");
  });
  it("later dismisses across success/history remounts only for this account", async () => {
    await mount(); await press("ไว้ภายหลัง"); expect(shown()).toBe(0); expect(mockEnable).not.toHaveBeenCalled(); expect(mockStore.has(INVITATION_DISMISSAL_KEY)).toBe(true);
    await renderer.act(async () => { tree!.unmount(); }); tree = undefined;
    await mount(); expect(shown()).toBe(0);
    await renderer.act(async () => { mockGeneration++; tree!.update(React.createElement(NotificationInvitation, { session: session("account-2") })); });
    expect(shown()).toBe(1);
  });
  it("disables both actions while saving and drops a late enable response after account switch", async () => {
    const late = deferred<string>(); mockEnable.mockReturnValue(late.promise); await mount(); await press("เปิดแจ้งเตือนการแข่งขัน");
    expect(tree!.root.findByProps({ accessibilityLabel: "ไว้ภายหลัง" }).props.disabled).toBe(true);
    await renderer.act(async () => { mockGeneration++; tree!.update(React.createElement(NotificationInvitation, { session: session("account-2") })); });
    expect(shown()).toBe(1);
    await renderer.act(async () => { late.resolve("enabled"); }); expect(shown()).toBe(1);
  });
  it("drops a late status result after logout/session generation change", async () => {
    const late = deferred<string>(); mockStatus.mockReturnValue(late.promise); await mount(); expect(shown()).toBe(0);
    await renderer.act(async () => { mockGeneration++; late.resolve("disabled"); }); expect(shown()).toBe(0);
  });
  it("quietly hides for later even if secure dismissal persistence fails", async () => {
    await mount(); jest.spyOn(mockStore, "set").mockImplementationOnce(() => { throw new Error("storage unavailable"); });
    await press("ไว้ภายหลัง"); expect(shown()).toBe(0); expect(mockEnable).not.toHaveBeenCalled();
  });
  it("hides on status/storage-read failure without blocking owned history", async () => {
    mockStatus.mockRejectedValue(new Error("offline")); await mount(); expect(shown()).toBe(0); expect(mockEnable).not.toHaveBeenCalled();
  });
});
