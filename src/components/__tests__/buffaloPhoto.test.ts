import React from "react";
import { AccessibilityInfo, ActivityIndicator, Dimensions, Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BuffaloCard } from "../BuffaloCard";
import { BuffaloPhoto, BuffaloPhotoFeedback, BuffaloPhotoStatus } from "../BuffaloPhoto";
import { createPhotoCoordinator } from "@/photos/coordinator";
import { colors, radius, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";
import { PHOTO_CANDIDATE_TIMEOUT_MS } from "@/photos/candidateQueue";
import { buffaloSex } from "@/utils/buffaloSex";
import { buffaloCardColumns, buffaloCardFooterHeight } from "../buffaloCardLayout";

// jest-expo already supplies this renderer; no application dependency is added.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => {
    root: TestNode;
    toJSON: () => unknown;
    update: (element: React.ReactElement) => void;
    unmount: () => void;
  };
};

type TestNode = {
  props: {
    style: StyleProp<ViewStyle>;
    source: { uri: string };
    resizeMode: string;
    accessibilityRole: string;
    accessibilityLabel: string;
    accessibilityState?: { busy?: boolean };
    children: unknown;
    numberOfLines?: number;
    maxFontSizeMultiplier?: number;
    onError: (...args: unknown[]) => void;
    onLoad: () => void;
    onPress: (event?: { stopPropagation: () => void }) => void;
  };
  findByType: (type: unknown) => TestNode;
  findAllByType: (type: unknown) => TestNode[];
  findByProps: (props: Record<string, unknown>) => TestNode;
  findAll: (predicate: (node: TestNode) => boolean) => TestNode[];
};

const source = "https://wtnqjxerhmdnqszkhbvs.supabase.co/storage/v1/object/public/slipstorage/buffalo/71.jpg";
const buffalo: MobileBuffaloCard = {
  tokenId: 71, microchip: "764040226600001", name: "ฟ้าประทาน", imageUrl: source,
  ageMonths: 91, birthdate: 1547337600, birthday: "2019-01-13", sex: "male", color: "black",
  certNo: null, rarity: null, href: "/cert/764040226600001",
};

describe("mounted native complete buffalo photo", () => {
  let tree: ReturnType<typeof renderer.create>;
  const originalWindow = Dimensions.get("window");
  beforeEach(() => {
    Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 1 } });
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => new Promise(() => {}));
  });
  afterEach(() => { if (tree) renderer.act(() => tree.unmount()); Dimensions.set({ window: originalWindow }); jest.useRealTimers(); jest.restoreAllMocks(); });
  function mount(uri: string | null = source) {
    renderer.act(() => { tree = renderer.create(React.createElement(BuffaloPhoto, { uri, label: "ฟ้าประทาน" })); });
  }

  it("preserves the source URL, contain and semantic inset without caller overrides", () => {
    mount();
    const image = tree.root.findByType(Image);
    expect(image.props.source).toEqual({ uri: source });
    expect(image.props.resizeMode).toBe("contain");
    expect(image.props.accessibilityLabel).toBe("ฟ้าประทาน");
    expect(StyleSheet.flatten(image.props.style)).toEqual({ flex: 1, width: "100%" });
    const inset = tree.root.findAllByType(View)[0];
    expect(StyleSheet.flatten(inset.props.style)).toEqual({ flex: 1, padding: spacing.xxs, backgroundColor: colors.surface });
  });

  it.each([null, ""])("renders an accessible stable missing-source fallback (%s)", (uri) => {
    mount(uri);
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findByProps({ accessibilityLabel: "ไม่มีภาพ ฟ้าประทาน" }).props.accessibilityRole).toBe("image");
    expect(JSON.stringify(tree.toJSON())).toContain("JAOTHUI");
  });

  it("keeps the source and frame stable during a slow load, then falls back on failure", () => {
    mount();
    const before = tree.root.findAllByType(View)[0].props.style;
    const onError = tree.root.findByType(Image).props.onError;
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: source, label: "ฟ้าประทาน" })));
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
    renderer.act(() => onError({ nativeEvent: { error: "404" } }));
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(tree.root.findAllByType(View)[0].props.style).toEqual(before);
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: source, label: "ฟ้าประทาน" })));
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it("resets failure on URI change and ignores a late error from the replaced source", () => {
    mount();
    const staleError = tree.root.findByType(Image).props.onError;
    renderer.act(() => staleError());
    const next = "https://example.invalid/portrait.jpg";
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: next, label: "ภาพใหม่" })));
    expect(tree.root.findByType(Image).props.source.uri).toBe(next);
    renderer.act(() => staleError());
    expect(tree.root.findByType(Image).props.source.uri).toBe(next);
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: null, label: "ภาพใหม่" })));
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: source, label: "ฟ้าประทาน" })));
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
  });

  it("keeps age outside the fixed photo frame and preserves card navigation and metadata", () => {
    const onPress = jest.fn();
    renderer.act(() => { tree = renderer.create(React.createElement(BuffaloCard, { buffalo, onPress })); });
    const card = tree.root.findAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.minWidth === 0)!;
    const cardStyle = StyleSheet.flatten(card.props.style);
    expect(cardStyle).toMatchObject({ flexBasis: "45%", flexGrow: 1, flexShrink: 1, minWidth: 0, borderRadius: radius.photo, borderColor: colors.photoHairline, backgroundColor: colors.surface });
    expect(cardStyle?.shadowOpacity).toBeUndefined();
    expect(cardStyle?.elevation).toBeUndefined();
    const frame = tree.root.findAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.aspectRatio === 3 / 2)!;
    expect(frame).toBeDefined();
    expect(frame.findAll((node) => typeof node.props.children === "string" && node.props.children.includes("เดือน"))).toHaveLength(0);
    const age = tree.root.findByProps({ children: "91 เดือน" });
    expect(StyleSheet.flatten(age.props.style)).toMatchObject({ fontWeight: "600" });
    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain("91 เดือน");
    expect(rendered).toContain(buffalo.name);
    expect(rendered).toContain(buffalo.microchip);
    renderer.act(() => tree.root.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps same-identity good bitmap until candidate decodes, rejects stale success/error and retains on failure", () => {
    const render = (uri: string | null, identity = "71", retry = 0) => React.createElement(BuffaloPhoto, { uri, identity, retry, label: "ฟ้าประทาน" });
    renderer.act(() => { tree = renderer.create(render(source)); });
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const next = `${source}?cacheNonce=b`, newer = `${source}?cacheNonce=c`;
    renderer.act(() => tree.update(render(next)));
    expect(tree.root.findAllByType(Image).map((node) => node.props.source.uri)).toEqual([source, next]);
    const stale = tree.root.findAllByType(Image)[1].props;
    renderer.act(() => tree.update(render(newer)));
    renderer.act(() => { stale.onLoad(); stale.onError(); });
    expect(tree.root.findAllByType(Image).map((node) => node.props.source.uri)).toEqual([source, newer]);
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onError());
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
    renderer.act(() => tree.update(render(newer, "71", 1)));
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onLoad());
    const accepted = tree.root.findByType(Image);
    expect(accepted.props.source.uri).toBe(newer);
    renderer.act(() => tree.update(render(newer, "71", 2)));
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    expect(tree.root.findByType(Image)).toBe(accepted);
    renderer.act(() => tree.update(render(null, "72")));
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it("recovers earlier 404 with unchanged URI only on deliberate revision retry", () => {
    const render = (retry: number) => React.createElement(BuffaloPhoto, { uri: source, identity: "71", label: "ฟ้าประทาน", retry });
    renderer.act(() => { tree = renderer.create(render(0)); });
    const stale = tree.root.findByType(Image).props;
    renderer.act(() => stale.onError());
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    renderer.act(() => tree.update(render(1)));
    renderer.act(() => stale.onLoad());
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it("StrictMode effect replay accepts the initial decode and keeps its Image on an unchanged retry", () => {
    const render = (retry: number) => React.createElement(React.StrictMode, null,
      React.createElement(BuffaloPhoto, { uri: source, identity: "71", label: "ฟ้าประทาน", retry }));
    renderer.act(() => { tree = renderer.create(render(0)); });
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const accepted = tree.root.findByType(Image);
    renderer.act(() => tree.update(render(1)));
    expect(tree.root.findByType(Image)).toBe(accepted);
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    renderer.act(() => tree.update(React.createElement(React.StrictMode, null,
      React.createElement(BuffaloPhoto, { uri: `${source}?v=bad`, identity: "71", label: "ฟ้าประทาน", retry: 2 }))));
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onError());
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
  });

  it("four hung native loads release their permits on deadline and ignore late callbacks", () => {
    jest.useFakeTimers();
    renderer.act(() => {
      tree = renderer.create(React.createElement(View, null, ...Array.from({ length: 5 }, (_, index) =>
        React.createElement(BuffaloPhoto, { key: index, identity: String(index), uri: `${source}?v=${index}`, label: `ควาย ${index}` }))));
    });
    const initial = tree.root.findAllByType(Image);
    expect(initial).toHaveLength(4);
    const late = initial[0].props;
    renderer.act(() => jest.advanceTimersByTime(PHOTO_CANDIDATE_TIMEOUT_MS));
    expect(tree.root.findAllByType(Image).map((node) => node.props.source.uri)).toEqual([`${source}?v=4`]);
    renderer.act(() => { late.onLoad(); late.onError(); });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    expect(tree.root.findByProps({ accessibilityLabel: "โหลดภาพไม่สำเร็จ ควาย 0" }).props.accessibilityState).toEqual({ busy: false });
  });

  it("timed-out replacement keeps good pixels, and a late load cannot cross identity", () => {
    jest.useFakeTimers();
    const render = (uri: string | null, identity = "71") => React.createElement(BuffaloPhoto, { uri, identity, label: "ฟ้าประทาน" });
    renderer.act(() => { tree = renderer.create(render(source)); });
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    renderer.act(() => tree.update(render(`${source}?v=bad`)));
    const late = tree.root.findAllByType(Image)[1].props;
    renderer.act(() => jest.advanceTimersByTime(PHOTO_CANDIDATE_TIMEOUT_MS));
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
    renderer.act(() => tree.update(render(null, "72")));
    renderer.act(() => late.onLoad());
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
  });

  it("shows queued/loading feedback until actual onLoad, not a parent rerender or onLoadEnd", () => {
    renderer.act(() => {
      tree = renderer.create(React.createElement(View, null, ...Array.from({ length: 5 }, (_, index) =>
        React.createElement(BuffaloPhoto, { key: index, identity: String(index), uri: `${source}?v=${index}`, label: `ควาย ${index}` }))));
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(4);
    // The fifth frame is waiting for a decode permit, but is never an unexplained black frame.
    expect(tree.root.findByProps({ accessibilityLabel: "กำลังโหลดภาพ… ควาย 4" }).props.accessibilityState).toEqual({ busy: true });
    const first = tree.root.findAllByType(Image)[0];
    expect((first.props as unknown as { onLoadEnd?: unknown }).onLoadEnd).toBeUndefined();
    renderer.act(() => first.props.onLoad());
    expect(tree.root.findAllByType(Image)).toHaveLength(5);
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === "กำลังโหลดภาพ… ควาย 0")).toHaveLength(0);
    expect(tree.root.findByProps({ accessibilityLabel: "กำลังโหลดภาพ… ควาย 4" }).props.accessibilityState?.busy).toBe(true);
  });

  it("distinguishes missing from failed and retries a timed-out unchanged URI without a screen loader", () => {
    jest.useFakeTimers();
    mount(null);
    expect(JSON.stringify(tree.toJSON())).toContain("ยังไม่มีภาพ");
    expect(tree.root.findAll((node) => node.props.accessibilityRole === "button")).toHaveLength(0);
    renderer.act(() => tree.update(React.createElement(BuffaloPhoto, { uri: source, label: "ฟ้าประทาน" })));
    const late = tree.root.findByType(Image).props;
    renderer.act(() => jest.advanceTimersByTime(PHOTO_CANDIDATE_TIMEOUT_MS));
    expect(JSON.stringify(tree.toJSON())).toContain("โหลดภาพไม่สำเร็จ");
    expect(JSON.stringify(tree.toJSON())).not.toContain("ยังไม่มีภาพ");
    const retry = tree.root.findByProps({ accessibilityLabel: "ลองโหลดภาพ ฟ้าประทาน อีกครั้ง" });
    expect(StyleSheet.flatten(retry.props.style)).toMatchObject({ minHeight: 44, minWidth: 44 });
    const event = { stopPropagation: jest.fn() };
    renderer.act(() => retry.props.onPress(event));
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType(Image).props.source.uri).toBe(source);
    expect(tree.root.findByProps({ accessibilityLabel: "กำลังโหลดภาพ… ฟ้าประทาน" }).props.accessibilityState?.busy).toBe(true);
    renderer.act(() => late.onLoad());
    expect(tree.root.findByProps({ accessibilityLabel: "กำลังโหลดภาพ… ฟ้าประทาน" })).toBeDefined();
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === "กำลังโหลดภาพ… ฟ้าประทาน")).toHaveLength(0);
    renderer.act(() => jest.advanceTimersByTime(PHOTO_CANDIDATE_TIMEOUT_MS * 2));
    expect(tree.root.findAllByType(Image)).toHaveLength(1); // no automatic retry loop
  });

  it("reserves outside-pixel feedback, keeps good bitmap, and nested local retry never navigates", () => {
    const onPress = jest.fn();
    const render = (uri: string) => React.createElement(BuffaloCard, { buffalo, onPress, photo: { uri, retry: 0 } });
    renderer.act(() => { tree = renderer.create(render(source)); });
    const slots = () => tree.root.findAllByType(View).filter((view) => StyleSheet.flatten(view.props.style)?.height === spacing.touchTarget);
    expect(slots()).toHaveLength(1);
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const good = tree.root.findByType(Image);
    renderer.act(() => tree.update(render(`${source}?v=b`)));
    const frame = tree.root.findAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.aspectRatio === 3 / 2)!;
    expect(frame.findAll((node) => node.props.accessibilityLabel === "อัปเดตภาพ… ฟ้าประทาน")).toHaveLength(0);
    expect(slots()[0].findByProps({ accessibilityLabel: "อัปเดตภาพ… ฟ้าประทาน" }).props.accessibilityState?.busy).toBe(true);
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onError());
    expect(tree.root.findByType(Image)).toBe(good);
    expect(slots()[0].findByProps({ accessibilityLabel: "อัปเดตไม่ได้ ฟ้าประทาน" })).toBeDefined();
    let stopped = false;
    const event = { stopPropagation: jest.fn(() => { stopped = true; }) };
    renderer.act(() => {
      tree.root.findByProps({ accessibilityLabel: "ลองโหลดภาพ ฟ้าประทาน อีกครั้ง" }).props.onPress(event);
      // Model native bubbling: without stopPropagation the containing card would navigate.
      if (!stopped) tree.root.props.onPress();
    });
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(Image)[0]).toBe(good);
    expect(tree.root.findAllByType(Image)[1].props.source.uri).toBe(`${source}?v=b`);
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onLoad());
    expect(slots()).toHaveLength(1);
    expect(slots()[0].findAll((node) => node.props.accessibilityLabel?.includes("ภาพ"))).toHaveLength(0);
    const accepted = tree.root.findByType(Image);
    renderer.act(() => tree.update(render(`${source}?v=b`)));
    expect(tree.root.findByType(Image)).toBe(accepted);
  });

  it("metadata refresh can finish while the independent image feedback remains busy", async () => {
    const next = `${source}?cacheNonce=new`;
    const read = jest.fn(async () => [{ microchip: buffalo.microchip, tokenId: "71", status: "ready" as const, imageUrl: next, sourceKey: next }]);
    const coordinator = createPhotoCoordinator(read);
    coordinator.seed([buffalo]); coordinator.setActive(true);
    const render = () => React.createElement(BuffaloPhotoFeedback, null,
      React.createElement(View, null, React.createElement(BuffaloPhoto, { ...coordinator.getSnapshot().photos.get(buffalo.microchip)!, label: buffalo.name! })),
      React.createElement(BuffaloPhotoStatus));
    renderer.act(() => { tree = renderer.create(render()); });
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    await coordinator.refresh(true);
    expect(coordinator.getSnapshot().refreshing).toBe(false);
    renderer.act(() => tree.update(render()));
    expect(tree.root.findByProps({ accessibilityLabel: `กำลังอัปเดตภาพ… ${buffalo.name}` }).props.accessibilityState?.busy).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onLoad());
    expect(tree.root.findAll((node) => Boolean(node.props.accessibilityState?.busy))).toHaveLength(0);
    coordinator.dispose();
  });

  it("honors reduced motion and a newer OS event wins over an older pending preference query", async () => {
    let resolve!: (enabled: boolean) => void;
    let change!: (enabled: boolean) => void;
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(new Promise((yes) => { resolve = yes; }));
    const remove = jest.fn();
    const observe = ((name: string, callback: unknown) => {
      if (name === "reduceMotionChanged") change = callback as (enabled: boolean) => void;
      return { remove };
    // The native emitter has overloaded event signatures; this fixture owns only
    // reduceMotionChanged and the public subscription.remove lifecycle.
    }) as unknown as typeof AccessibilityInfo.addEventListener;
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(observe);
    mount();
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    renderer.act(() => change(false));
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    renderer.act(() => change(true));
    await renderer.act(async () => { resolve(false); await Promise.resolve(); });
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    expect(tree.root.findByProps({ accessibilityLabel: "กำลังโหลดภาพ… ฟ้าประทาน" }).props.accessibilityState?.busy).toBe(true);
    renderer.act(() => tree.unmount());
    expect(remove).toHaveBeenCalled();
  });

  it("fits complete source bounds uniformly for five ratios in narrow/card/detail frames", () => {
    mount();
    const inset = StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style).padding as number;
    expect(tree.root.findByType(Image).props.resizeMode).toBe("contain");
    for (const frameWidth of [132, 166, 353, 728]) {
      const frameHeight = frameWidth / (3 / 2);
      const innerWidth = frameWidth - 2 * inset;
      const innerHeight = frameHeight - 2 * inset;
      for (const [width, height] of [[3000, 2000], [1920, 1080], [1600, 1200], [1024, 1024], [800, 1200]]) {
        const scale = Math.min(innerWidth / width, innerHeight / height);
        const renderedWidth = width * scale;
        const renderedHeight = height * scale;
        const left = inset + (innerWidth - renderedWidth) / 2;
        const top = inset + (innerHeight - renderedHeight) / 2;
        expect(renderedWidth / renderedHeight).toBeCloseTo(width / height);
        expect(left).toBeGreaterThanOrEqual(inset - 1e-6);
        expect(top).toBeGreaterThanOrEqual(inset - 1e-6);
        expect(left + renderedWidth).toBeLessThanOrEqual(frameWidth - inset + 1e-6);
        expect(top + renderedHeight).toBeLessThanOrEqual(frameHeight - inset + 1e-6);
      }
      const available = frameWidth * 2 + spacing.cardGap;
      expect(available * 0.45 * 2 + spacing.cardGap).toBeLessThanOrEqual(available);
    }
  });

  it("keeps the edge-filled rectangular source clear of the rounded gallery corners", () => {
    mount();
    const inset = StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style).padding as number;
    // The worst case is a source with exactly the inner frame's ratio: all
    // corners sit at (inset, inset). Other contain ratios move corners inward.
    const cornerIsSafe = (padding: number, clipRadius: number) =>
      Math.hypot(clipRadius - padding, clipRadius - padding) <= clipRadius;
    expect(cornerIsSafe(inset, radius.photo)).toBe(true);
    expect(cornerIsSafe(inset, radius.card)).toBe(false); // old 18px radius is unsafe at 4px
    expect(cornerIsSafe(0, radius.photo)).toBe(false);
  });

  it.each([
    ["male", "ผู้", "เพศผู้"], [" FEMALE ", "เมีย", "เพศเมีย"],
    [null, "ไม่ระบุ", "ไม่ระบุเพศ"], ["unknown", "ไม่ระบุ", "ไม่ระบุเพศ"],
  ])("renders real card sex %s, two-line Thai title and footer after metadata", (sex, label, accessibleLabel) => {
    const name = "เจ้าหญิงเจนนี่แห่งทุ่งหญ้าสีทองชื่อยาวเพื่อทดสอบ";
    renderer.act(() => { tree = renderer.create(React.createElement(BuffaloCard, {
      buffalo: { ...buffalo, sex, name, ageMonths: null }, onPress: jest.fn(),
    })); });
    expect(tree.root.findByProps({ accessibilityLabel: accessibleLabel })).toBeDefined();
    const title = tree.root.findByProps({ children: name });
    expect(title.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({ fontSize: 15, minWidth: 0, flex: 1 });
    expect(JSON.stringify(tree.toJSON())).toContain(label);
    const footer = tree.root.findByProps({ testID: "card-photo-footer" });
    expect(StyleSheet.flatten(footer.props.style)).toMatchObject({ height: 44 });
    expect(footer.findByProps({ children: "น้อยกว่าหนึ่งเดือน" })).toBeDefined();
    const frame = tree.root.findAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.aspectRatio === 3 / 2)!;
    expect(frame.findAll((node) => node.props.children === "น้อยกว่าหนึ่งเดือน")).toHaveLength(0);
    const serialized = JSON.stringify(tree.toJSON());
    expect(serialized.indexOf("card-photo-footer")).toBeGreaterThan(serialized.indexOf(buffalo.microchip));
    const before = footer.props.style;
    renderer.act(() => tree.root.findByType(Image).props.onError());
    expect(tree.root.findByProps({ testID: "card-photo-footer" }).props.style).toEqual(before);
  });

  it("normalizes only canonical source sex values identically to Web", () => {
    for (const value of ["male", " Male ", "MALE"]) expect(buffaloSex(value)).toEqual({ symbol: "♂", label: "ผู้", accessibleLabel: "เพศผู้" });
    for (const value of ["female", " FEMALE "]) expect(buffaloSex(value)).toEqual({ symbol: "♀", label: "เมีย", accessibleLabel: "เพศเมีย" });
    for (const value of [null, undefined, "", " ", "m", "f", "ชาย", "เมีย", "unknown", 1, {}]) expect(buffaloSex(value)).toEqual({ symbol: "", label: "ไม่ระบุ", accessibleLabel: "ไม่ระบุเพศ" });
  });

  it("uses one responsive policy and stable footer extent without shrinking fonts", () => {
    for (const width of [320, 360]) expect(buffaloCardColumns(width, 1)).toBe(1);
    for (const width of [375, 390, 430, 768]) expect(buffaloCardColumns(width, 1)).toBe(2);
    for (const width of [320, 390, 768]) expect(buffaloCardColumns(width, 1.3)).toBe(1);
    expect(buffaloCardFooterHeight(1)).toBe(44);
    expect(buffaloCardFooterHeight(1.5)).toBe(66);
    expect(buffaloCardFooterHeight(2)).toBe(88);
    renderer.act(() => { tree = renderer.create(React.createElement(BuffaloCard, { buffalo, onPress: jest.fn() })); });
    renderer.act(() => Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 2 } }));
    const footer = tree.root.findByProps({ testID: "card-photo-footer" });
    expect(StyleSheet.flatten(footer.props.style)?.height).toBe(88);
    const card = tree.root.findAllByType(View).find((view) => StyleSheet.flatten(view.props.style)?.borderColor === colors.photoHairline)!;
    expect(StyleSheet.flatten(card.props.style)?.flexBasis).toBe("100%");
  });

  it("card footer error keeps uncapped full copy, stable Image, local retry and no fetch", () => {
    const onPress = jest.fn();
    const fetch = jest.spyOn(globalThis, "fetch");
    const render = (uri: string, chip = buffalo.microchip) => React.createElement(BuffaloCard, { buffalo: { ...buffalo, ageMonths: null, microchip: chip }, onPress, photo: { uri, retry: 0 } });
    renderer.act(() => { tree = renderer.create(render(source)); });
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const good = tree.root.findByType(Image);
    const footer = () => tree.root.findByProps({ testID: "card-photo-footer" });
    const height = StyleSheet.flatten(footer().props.style)?.height;
    renderer.act(() => tree.update(render(`${source}?candidate=b`)));
    expect(StyleSheet.flatten(footer().props.style)?.height).toBe(height);
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onError());
    const copy = footer().findByProps({ children: "อัปเดตไม่ได้" });
    expect(footer().findByProps({ children: "น้อยกว่าหนึ่งเดือน" })).toBeDefined();
    expect(copy.props.numberOfLines).toBeUndefined();
    expect(copy.props.maxFontSizeMultiplier).toBeUndefined();
    expect(tree.root.findByType(Image)).toBe(good);
    renderer.act(() => Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 2 } }));
    expect(StyleSheet.flatten(footer().props.style)?.height).toBe(88);
    expect(footer().findByProps({ children: "น้อยกว่าหนึ่งเดือน" })).toBeDefined();
    expect(footer().findByProps({ children: "อัปเดตไม่ได้" }).props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(footer().findByProps({ accessibilityLabel: "ลองโหลดภาพ ฟ้าประทาน อีกครั้ง" }).props.style)).toMatchObject({ minHeight: 44, minWidth: 44 });
    const stopped = jest.fn();
    renderer.act(() => footer().findByProps({ accessibilityLabel: "ลองโหลดภาพ ฟ้าประทาน อีกครั้ง" }).props.onPress({ stopPropagation: stopped }));
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    renderer.act(() => tree.root.findAllByType(Image)[1].props.onLoad());
    const accepted = tree.root.findByType(Image);
    renderer.act(() => tree.update(render(`${source}?candidate=b`)));
    expect(tree.root.findByType(Image)).toBe(accepted);
    renderer.act(() => tree.update(render(source, "764040226600002")));
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    expect(tree.root.findByType(Image)).not.toBe(accepted);
    expect(footer().findAll((node) => node.props.children === "อัปเดตไม่ได้")).toHaveLength(0);
  });
});
