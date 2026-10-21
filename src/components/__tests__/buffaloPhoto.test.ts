import React from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BuffaloCard } from "../BuffaloCard";
import { BuffaloPhoto } from "../BuffaloPhoto";
import { colors, radius, spacing } from "@/design/tokens";
import type { MobileBuffaloCard } from "@/types/mobile-api";
import { PHOTO_CANDIDATE_TIMEOUT_MS } from "@/photos/candidateQueue";

// jest-expo already supplies this renderer; no application dependency is added.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void) => void;
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
    children: unknown;
    onError: (...args: unknown[]) => void;
    onLoad: () => void;
    onPress: () => void;
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
  afterEach(() => { if (tree) renderer.act(() => tree.unmount()); jest.useRealTimers(); });
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
    expect(tree.root.findByProps({ accessibilityLabel: "ไม่มีภาพ ควาย 0" })).toBeDefined();
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
});
