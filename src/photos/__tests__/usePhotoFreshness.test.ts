import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { usePhotoFreshness } from "../usePhotoFreshness";
import { getBuffaloPhotos } from "@/api/jaothui";
import type { PhotoEntry } from "../contract";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (action: () => void | Promise<void>) => Promise<void>;
  create: (element: React.ReactElement) => { update: (element: React.ReactElement) => void; unmount: () => void };
};
let mockFocus: (() => void) | null = null;
let mockBlur: (() => void) | null = null;
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => (() => void)) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react").useEffect(() => {
    const start = () => { mockBlur = callback(); };
    mockFocus = start; start(); return () => mockBlur?.();
  }, [callback]);
} }));
jest.mock("@/api/jaothui", () => ({ getBuffaloPhotos: jest.fn() }));

const id = "764040226600001";
const source = "https://wtnqjxerhmdnqszkhbvs.supabase.co/storage/v1/object/public/slipstorage/buffalo/71.jpg";
const entries: PhotoEntry[] = [{ microchip: id, imageUrl: source }];
let latest: ReturnType<typeof usePhotoFreshness>;
let appState: (state: AppStateStatus) => void;
const heavyResource = jest.fn();
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function Harness({ values = entries }: { values?: PhotoEntry[] }) {
  latest = usePhotoFreshness(values);
  useEffect(() => { heavyResource(); }, []);
  return null;
}
describe("mounted focused native photo lifecycle", () => {
  let tree: ReturnType<typeof renderer.create>;
  let at = 1000;
  beforeEach(() => {
    at = 1000; jest.spyOn(Date, "now").mockImplementation(() => at);
    Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
      appState = callback; return { remove: jest.fn() };
    });
    (getBuffaloPhotos as jest.Mock).mockResolvedValue([{ tokenId: "71", microchip: id, status: "ready", imageUrl: `${source}?v=b`, sourceKey: "b" }]);
  });
  afterEach(async () => {
    if (tree) await renderer.act(() => tree.unmount());
    jest.restoreAllMocks(); jest.clearAllMocks();
  });
  it("coalesces active/focus triggers and never refetches the screen's business resource", async () => {
    await renderer.act(() => { tree = renderer.create(React.createElement(Harness)); });
    expect(getBuffaloPhotos).not.toHaveBeenCalled(); expect(heavyResource).toHaveBeenCalledTimes(1);
    at += 30_000;
    await renderer.act(async () => { mockFocus?.(); appState("active"); await flush(); });
    expect(getBuffaloPhotos).toHaveBeenCalledTimes(1);
    expect(latest.photos.get(id)?.uri).toContain("v=b"); expect(heavyResource).toHaveBeenCalledTimes(1);
    await renderer.act(async () => { latest.refresh(); await flush(); }); expect(getBuffaloPhotos).toHaveBeenCalledTimes(2);
    await renderer.act(() => { mockBlur?.(); at += 30_000; appState("active"); latest.refresh(); });
    expect(getBuffaloPhotos).toHaveBeenCalledTimes(2);
    await renderer.act(async () => { mockFocus?.(); appState("background"); latest.refresh(); await flush(); });
    const before = (getBuffaloPhotos as jest.Mock).mock.calls.length;
    at += 30_000; await renderer.act(() => latest.refresh()); expect(getBuffaloPhotos).toHaveBeenCalledTimes(before);
  });
  it("React19 StrictMode effect replay remains live; rerenders do not churn source or seed age", async () => {
    await renderer.act(() => { tree = renderer.create(React.createElement(React.StrictMode, null, React.createElement(Harness))); });
    at += 30_000;
    await renderer.act(async () => { latest.refresh(); await flush(); }); expect(getBuffaloPhotos).toHaveBeenCalledTimes(1);
    const refreshed = latest.photos.get(id);
    expect(refreshed?.uri).toContain("v=b");
    await renderer.act(() => tree.update(React.createElement(React.StrictMode, null, React.createElement(Harness, { values: [...entries] }))));
    expect(latest.photos.get(id)).toEqual(refreshed);
    await renderer.act(() => { appState("active"); }); expect(getBuffaloPhotos).toHaveBeenCalledTimes(1);
  });
});
