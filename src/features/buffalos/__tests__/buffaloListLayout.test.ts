import React from "react";
import { AccessibilityInfo, Dimensions, FlatList, Image, ScrollView, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { BuffaloListScreen } from "../BuffaloListScreen";
import { BuffaloCard } from "@/components/BuffaloCard";
import { getBuffalos } from "@/api/jaothui";
import { usePhotoFreshness } from "@/photos/usePhotoFreshness";
import { buffaloCardFooterHeight } from "@/components/buffaloCardLayout";
import { colors, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("@/api/jaothui", () => ({ getBuffalos: jest.fn() }));
jest.mock("@/photos/usePhotoFreshness", () => ({ usePhotoFreshness: jest.fn(() => mockPhotos) }));
jest.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react").createElement(require("react-native").View, { testID: "list-shell" }, children);
} }));
const mockRouter = { push: jest.fn() };
const mockPhotos = { photos: new Map(), refreshing: false, refresh: jest.fn(), status: "idle" };
const items: MobileBuffaloCard[] = Array.from({ length: 8 }, (_, index) => ({
  tokenId: index + 1, name: `กระบือ ${index}`, microchip: `76404022660${String(index).padStart(4, "0")}`,
  imageUrl: `https://example.invalid/${index}.jpg`, ageMonths: 21, birthdate: 1547337600,
  birthday: "2019-01-13", sex: "female", color: "black", certNo: null, rarity: null, href: "/cert/test",
}));
type TestNode = {
  props: Record<string, any>;
  findByType: (type: unknown) => TestNode;
  findAllByType: (type: unknown) => TestNode[];
  findByProps: (props: Record<string, unknown>) => TestNode;
};
// jest-expo supplies this renderer. No app dependency or native layout proof is implied.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (action: () => void | Promise<void>) => Promise<void>;
  create: (element: React.ReactElement) => { root: TestNode; update: (element: React.ReactElement) => void; unmount: () => void };
};
const style = (node: TestNode) => StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {};

describe("real virtualized list parent and natural card extent", () => {
  const originalWindow = Dimensions.get("window");
  let tree: ReturnType<typeof renderer.create> | undefined;
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => new Promise(() => {}));
    (getBuffalos as jest.Mock).mockResolvedValue({ items, pagination: { page: 1, totalPages: 2, totalCount: 38 } });
  });
  afterEach(async () => {
    if (tree) await renderer.act(() => tree!.unmount());
    tree = undefined; Dimensions.set({ window: originalWindow }); jest.restoreAllMocks(); jest.useRealTimers();
  });
  async function mount(width: number, fontScale = 1) {
    Dimensions.set({ window: { width, height: 844, scale: 1, fontScale } });
    await renderer.act(() => { tree = renderer.create(React.createElement(BuffaloListScreen)); });
    await renderer.act(async () => { jest.advanceTimersByTime(0); await Promise.resolve(); });
  }
  const list = () => tree!.root.findByType(FlatList);
  const cards = () => tree!.root.findAllByType(View).filter((node) => style(node).minWidth === 0 && style(node).borderWidth === 1 && style(node).backgroundColor === colors.surface);

  it.each([[350, 1, 1], [390, 1, 2], [390, 1.3, 1]])("owns list geometry at width %s / font %s (%s columns), preserving photo/body/footer extent", async (width, fontScale, columns) => {
    await mount(width, fontScale);
    expect(list().props).toMatchObject({ numColumns: columns, removeClippedSubviews: true, initialNumToRender: 6, maxToRenderPerBatch: 6, updateCellsBatchingPeriod: 40, windowSize: 5 });
    expect(list().props.renderItem({ item: items[0] }).props.layout).toBe("list");
    const card = cards()[0], cardStyle = style(card);
    if (columns === 1) {
      expect(cardStyle).toMatchObject({ width: "100%", flexBasis: "auto", flexGrow: 0, flexShrink: 0 });
      // No height, percentage main-axis basis or flex growth ties the card to viewport/cell height.
      expect(cardStyle.height).toBeUndefined(); expect(cardStyle.minHeight).toBeUndefined(); expect(cardStyle.maxHeight).toBeUndefined();
      expect(list().props.columnWrapperStyle).toBeUndefined();
    } else {
      expect(cardStyle).toMatchObject({ flexBasis: "45%", flexGrow: 1, flexShrink: 1 });
      expect(cardStyle.width).toBeUndefined();
      expect(StyleSheet.flatten(list().props.columnWrapperStyle)).toMatchObject({ gap: spacing.cardGap });
      expect(tree!.root.findAllByType(View).some((node) => style(node).flexDirection === "row" && style(node).gap === spacing.cardGap)).toBe(true);
    }
    const views = card.findAllByType(View);
    const frame = views.find((node) => style(node).aspectRatio === 3 / 2)!;
    const footer = views.find((node) => style(node).height === buffaloCardFooterHeight(fontScale))!;
    expect(frame).toBeDefined(); expect(footer).toBeDefined();
    const image = card.findByType(Image);
    expect(image.props.resizeMode).toBe("contain");
    const dimensionsBefore = { card: cardStyle, frame: style(frame), footer: style(footer) };
    await renderer.act(() => image.props.onLoad());
    expect({ card: style(card), frame: style(frame), footer: style(footer) }).toEqual(dimensionsBefore);
    expect(card.findByType(Image)).toBe(image);
    expect((usePhotoFreshness as jest.Mock).mock.calls.some(([entries]) => entries === items)).toBe(true);
  });

  it("preserves retained cells/good bitmaps across scroll and same-column resize, with no screen/photo reload", async () => {
    await mount(350);
    const firstList = list(), firstCard = cards()[0], image = firstCard.findByType(Image);
    await renderer.act(() => image.props.onLoad());
    const scroll = tree!.root.findAllByType(ScrollView).find((node) => typeof node.props.onScroll === "function")!;
    expect(scroll).toBeDefined();
    const beforeRequests = (getBuffalos as jest.Mock).mock.calls.length;
    await renderer.act(() => {
      for (let index = 0; index < 20; index++) scroll.props.onScroll({ timeStamp: 1000 + index * 16, nativeEvent: { contentOffset: { x: 0, y: index % 2 ? 80 : 0 }, contentSize: { width: 350, height: 4000 }, layoutMeasurement: { width: 350, height: 700 }, zoomScale: 1 } });
      Dimensions.set({ window: { width: 360, height: 700, scale: 1, fontScale: 1.3 } });
      jest.advanceTimersByTime(500);
    });
    expect(list()).toBe(firstList); expect(cards()[0]).toBe(firstCard); expect(cards()[0].findByType(Image)).toBe(image);
    expect((getBuffalos as jest.Mock).mock.calls.length).toBe(beforeRequests);
    expect(mockPhotos.refresh).not.toHaveBeenCalled();
    expect(list().props.onScroll).toBeUndefined();
    // The only intentional list remount is the existing one/two-column layout-key transition.
    await renderer.act(() => Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 1 } }));
    expect(list()).not.toBe(firstList); expect(list().props.numColumns).toBe(2);
  });

  it("keeps search, refresh and card navigation wired while resizing never creates a new query", async () => {
    await mount(350);
    await renderer.act(() => jest.advanceTimersByTime(500));
    const before = (getBuffalos as jest.Mock).mock.calls.length;
    await renderer.act(() => Dimensions.set({ window: { width: 390, height: 700, scale: 1, fontScale: 1 } }));
    expect(getBuffalos).toHaveBeenCalledTimes(before);
    await renderer.act(() => tree!.root.findByType(TextInput).props.onChangeText("ค้นหา"));
    await renderer.act(() => { jest.advanceTimersByTime(400); });
    await renderer.act(async () => { jest.advanceTimersByTime(0); await Promise.resolve(); });
    expect(getBuffalos).toHaveBeenLastCalledWith(expect.objectContaining({ search: "ค้นหา", page: 1 }));
    const element = list().props.renderItem({ item: items[0] });
    element.props.onPress(); expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/certs/[microchip]", params: { microchip: items[0].microchip } });
    list().props.onRefresh(); expect(mockPhotos.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([[350, 1], [390, 1], [390, 1.3]])("does not apply list ownership to Home/owned default-grid cards at %s / %s", async (width, fontScale) => {
    Dimensions.set({ window: { width, height: 844, scale: 1, fontScale } });
    await renderer.act(() => { tree = renderer.create(React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", gap: spacing.cardGap } }, React.createElement(BuffaloCard, { buffalo: items[0], onPress: () => {} }))); });
    const gridStyle = style(cards()[0]);
    expect(gridStyle).toMatchObject({ flexBasis: width < 375 || fontScale > 1.15 ? "100%" : "45%", flexGrow: 1, flexShrink: 1, minWidth: 0 });
    expect(gridStyle.width).toBeUndefined();
  });
});
