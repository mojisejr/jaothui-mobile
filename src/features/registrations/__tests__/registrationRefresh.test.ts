import React, { useEffect as mockUseEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { MobileApiError } from "@/api/client";
import { sameCustomer, type CustomerSession } from "../customer";
import { useRegistrationResource, type PrivateRegistrationData } from "../useRegistrationResource";
let mockFocused = true;
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => (() => void)) => mockUseEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]) }));
jest.mock("../customer", () => ({ sameCustomer: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (fn: () => void | Promise<void>) => Promise<void>; create: (node: React.ReactElement) => { update: (node: React.ReactElement) => void; unmount: () => void } };
const session = { sessionToken: "private", identity: { accountId: "account" } } as CustomerSession;
const value = (text: string): PrivateRegistrationData<string> => ({ session, value: text });
const deferred = () => { let resolve!: (v: PrivateRegistrationData<string>) => void; const promise = new Promise<PrivateRegistrationData<string>>(r => { resolve = r; }); return { promise, resolve }; };
let result: ReturnType<typeof useRegistrationResource<string>>;
function Harness({ loader, focused = true }: { loader: () => Promise<PrivateRegistrationData<string>>; focused?: boolean }) { mockFocused = focused; result = useRegistrationResource(loader, 10000); return null; }
describe("visible private applicant refresh", () => {
  let tree: ReturnType<typeof renderer.create>, change: (state: AppStateStatus) => void;
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks(); mockFocused = true;
    (sameCustomer as jest.Mock).mockResolvedValue(true);
    Object.defineProperty(AppState, "currentState", { configurable: true, value: "active", writable: true });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => { change = callback; return { remove: jest.fn() }; });
  });
  afterEach(async () => { if (tree) await renderer.act(() => tree.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });
  const move = async (state: AppStateStatus) => renderer.act(async () => { AppState.currentState = state; change(state); });
  it("polls only in foreground, clears private data on background and ignores pre-background late results", async () => {
    const late = deferred(); const loader = jest.fn().mockReturnValueOnce(late.promise).mockResolvedValue(value("fresh"));
    await renderer.act(async () => { tree = renderer.create(React.createElement(Harness, { loader })); });
    await move("background");
    await renderer.act(async () => jest.advanceTimersByTime(30000)); expect(loader).toHaveBeenCalledTimes(1); expect(result.data).toBeNull();
    await move("active"); expect(result.data?.value).toBe("fresh");
    await renderer.act(async () => late.resolve(value("old-private"))); expect(result.data?.value).toBe("fresh");
    await renderer.act(async () => jest.advanceTimersByTime(10000)); expect(loader).toHaveBeenCalledTimes(3);
  });
  it("keeps same-account data visibly stale on network/server error, but clears it on invalid access", async () => {
    const loader = jest.fn().mockResolvedValueOnce(value("known"));
    await renderer.act(async () => { tree = renderer.create(React.createElement(Harness, { loader })); });
    loader.mockRejectedValueOnce(new MobileApiError("upstream unavailable", "SERVICE_UNAVAILABLE", 503));
    await renderer.act(async () => result.reload()); expect(result.data?.value).toBe("known"); expect(result.error?.message).toBe("upstream unavailable");
    loader.mockRejectedValueOnce(new MobileApiError("expired", "UNAUTHENTICATED", 401));
    await renderer.act(async () => result.reload()); expect(result.data).toBeNull(); expect(result.status).toBe("error");
  });
  it("rejects data for a switched account and drops results after route blur", async () => {
    const late = deferred(); const loader = jest.fn().mockResolvedValueOnce(value("first")).mockReturnValueOnce(late.promise);
    await renderer.act(async () => { tree = renderer.create(React.createElement(Harness, { loader })); });
    await renderer.act(async () => { void result.reload(); });
    await renderer.act(async () => tree.update(React.createElement(Harness, { loader, focused: false })));
    await renderer.act(async () => late.resolve(value("late"))); expect(result.data).toBeNull();
    (sameCustomer as jest.Mock).mockResolvedValue(false); loader.mockResolvedValue(value("foreign"));
    await renderer.act(async () => tree.update(React.createElement(Harness, { loader, focused: true })));
    expect(result.data).toBeNull(); expect(result.error?.message).toContain("บัญชีเปลี่ยน");
  });
});
