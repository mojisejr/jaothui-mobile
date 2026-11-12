import React from "react";
import { AccessibilityInfo, Dimensions, Image, Platform, Share, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Clipboard from "expo-clipboard";
import { BuffaloCard } from "../BuffaloCard";
import { CopyMicrochip } from "../CopyMicrochip";
import { BuffaloPhotoFeedback } from "../BuffaloPhoto";
import { CertDetailScreen } from "@/features/certs/CertDetailScreen";
import { shareOrDownloadCertificate } from "@/features/certs/certificateFile";
import { getCertCertificate, getCertRewards, getCertSummary } from "@/api/jaothui";
import { colors, spacing } from "@/design/tokens";
import type { MobileBuffaloDetail } from "@/types/mobile-api";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ microchip: mockBuffalo.microchip }) }));
jest.mock("@/api/jaothui", () => ({ getCertSummary: jest.fn(), getCertRewards: jest.fn(), getCertCertificate: jest.fn() }));
jest.mock("@/features/certs/certificateFile", () => ({ shareOrDownloadCertificate: jest.fn() }));
jest.mock("@/photos/usePhotoFreshness", () => ({ usePhotoFreshness: () => mockPhotos }));
jest.mock("@/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("react").createElement(require("react-native").View, null, children);
} }));
const mockRouter = { back: jest.fn(), push: jest.fn() };
const mockPhotos = { photos: new Map(), refreshing: false, refresh: jest.fn(), status: "idle" };
const buffalo: MobileBuffaloDetail = {
  tokenId: 71, microchip: "000040226601197", name: "ฟ้าประทาน", imageUrl: "https://example.invalid/buffalo.jpg",
  ageMonths: 91, birthdate: 1547337600, birthday: "2019-01-13", sex: "male", color: "black", certNo: null, rarity: null,
  href: "/cert/000040226601197", origin: "thai", detail: null, height: null, dna: null, fatherId: "father-only", motherId: "mother-only",
  certificate: null, actions: { certificate: "", rewardDetailTemplate: "", share: "" },
};
let mockBuffalo = buffalo;
type TestNode = {
  parent: TestNode | null;
  children: (TestNode | string)[];
  props: Record<string, any>;
  findByType: (type: unknown) => TestNode;
  findAllByType: (type: unknown) => TestNode[];
  findByProps: (props: Record<string, unknown>) => TestNode;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => { root: TestNode; update: (element: React.ReactElement) => void; unmount: () => void };
};
const style = (node: TestNode) => StyleSheet.flatten((typeof node.props.style === "function" ? node.props.style({ pressed: false }) : node.props.style) as StyleProp<ViewStyle>) ?? {};

describe("mounted card and certificate microchip integration", () => {
  const originalWindow = Dimensions.get("window");
  const write = jest.mocked(Clipboard.setStringAsync);
  let tree: ReturnType<typeof renderer.create>;
  const navigate = jest.fn();
  const cardElement = (item = buffalo) => React.createElement(BuffaloCard, { buffalo: item, onPress: navigate });
  function mountCard() { renderer.act(() => { tree = renderer.create(cardElement()); }); }
  const copy = (chip = buffalo.microchip) => tree.root.findByProps({ accessibilityLabel: `คัดลอกไมโครชิป ${chip}` });
  async function pressCopy() { await renderer.act(async () => { await copy().props.onPress(); }); }
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks(); mockBuffalo = buffalo; write.mockReset().mockResolvedValue(true);
    jest.mocked(getCertSummary).mockImplementation(async () => ({ buffalo: mockBuffalo }));
    jest.mocked(getCertRewards).mockResolvedValue({ rewards: [] });
    Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 1 } });
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockImplementation(() => new Promise(() => {}));
  });
  afterEach(() => { renderer.act(() => tree?.unmount()); Dimensions.set({ window: originalWindow }); jest.restoreAllMocks(); jest.useRealTimers(); });

  it("copies exactly from a sibling target without navigation, API, photo retry or replacing a good image", async () => {
    const fetch = jest.spyOn(globalThis, "fetch"); mountCard();
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const image = tree.root.findByType(Image), photo = tree.root.findByProps({ identity: buffalo.microchip, uri: buffalo.imageUrl }), feedback = tree.root.findByType(BuffaloPhotoFeedback);
    const card = tree.root.findAllByType(View).find((node) => style(node).borderColor === colors.photoHairline)!;
    // Walk the mounted ancestry: there is no navigation handler above the copy target.
    for (let node = copy().parent; node && node !== card; node = node.parent) expect(node.props.onPress).toBeUndefined();
    const assertPhoto = () => {
      expect(tree.root.findByType(Image)).toBe(image);
      expect(tree.root.findByProps({ identity: buffalo.microchip, uri: buffalo.imageUrl })).toBe(photo);
      expect(tree.root.findByType(BuffaloPhotoFeedback)).toBe(feedback);
      expect(photo.props).toMatchObject({ identity: buffalo.microchip, uri: buffalo.imageUrl });
    };
    await pressCopy(); expect(copy().props.accessibilityValue.text).toBe("คัดลอกแล้ว"); assertPhoto();
    write.mockResolvedValueOnce(false); await pressCopy(); expect(copy().props.accessibilityValue.text).toBe("คัดลอกไม่สำเร็จ"); assertPhoto();
    renderer.act(() => jest.advanceTimersByTime(1800)); assertPhoto();
    expect(write.mock.calls).toEqual([[buffalo.microchip], [buffalo.microchip]]);
    expect(navigate).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(mockPhotos.refresh).not.toHaveBeenCalled();
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it.each(["card-image-navigation", "card-name-navigation"])("preserves normal detail navigation through %s without a clipboard write", (testID) => {
    mountCard(); renderer.act(() => tree.root.findByProps({ testID }).props.onPress());
    expect(navigate).toHaveBeenCalledTimes(1); expect(write).not.toHaveBeenCalled();
  });

  it("keeps independent card feedback and clears recycled identity without leaking the old bitmap", async () => {
    const second = { ...buffalo, tokenId: 72, microchip: "000040226601198", name: "ขวัญใจ" };
    renderer.act(() => { tree = renderer.create(React.createElement(View, null, cardElement(), cardElement(second))); });
    const photos = tree.root.findAllByType(Image);
    renderer.act(() => photos.forEach((image) => image.props.onLoad()));
    await pressCopy();
    expect(copy().props.accessibilityValue.text).toBe("คัดลอกแล้ว");
    expect(copy(second.microchip).props.accessibilityValue.text).toBe("แตะเพื่อคัดลอก");
    expect(tree.root.findAllByType(Image)).toEqual(photos);
    renderer.act(() => tree.update(React.createElement(View, null, cardElement(second), cardElement(second))));
    expect(tree.root.findAllByType(CopyMicrochip)[0].findByProps({ accessibilityRole: "button" }).props.accessibilityValue.text).toBe("แตะเพื่อคัดลอก");
    expect(tree.root.findAllByType(Image)[0]).not.toBe(photos[0]);
  });

  it.each([[320, 1], [360, 1], [375, 1], [390, 1], [320, 1.3], [390, 1.3], [320, 2], [390, 2]])("keeps growing copy text, photo geometry and column policy at %spx/font%s", async (width, fontScale) => {
    Dimensions.set({ window: { width, height: 844, scale: 1, fontScale } }); mountCard();
    const card = tree.root.findAllByType(View).find((node) => style(node).borderColor === colors.photoHairline)!;
    const frame = tree.root.findAllByType(View).find((node) => style(node).aspectRatio === 3 / 2)!;
    const footer = tree.root.findByProps({ testID: "card-photo-footer" });
    const geometry = [style(card), style(frame), style(footer)];
    expect(style(card).flexBasis).toBe(width < 375 || fontScale > 1.15 ? "100%" : "45%");
    expect(style(copy())).toMatchObject({ minHeight: spacing.touchTarget });
    for (const node of tree.root.findByType(CopyMicrochip).findAllByType(Text)) {
      expect(node.props.numberOfLines).toBeUndefined(); expect(node.props.maxFontSizeMultiplier).toBeUndefined();
      expect(style(node).height).toBeUndefined();
    }
    await pressCopy(); expect([style(card), style(frame), style(footer)]).toEqual(geometry);
  });

  it("copies only the detail chip under the name while parent identifiers stay static", async () => {
    const fetch = jest.spyOn(globalThis, "fetch");
    await renderer.act(async () => { tree = renderer.create(React.createElement(CertDetailScreen)); });
    const controls = tree.root.findAllByType(CopyMicrochip); expect(controls).toHaveLength(1);
    const title = tree.root.findByProps({ children: buffalo.name });
    expect(controls[0].parent).toBe(title.parent);
    expect(title.parent!.children.indexOf(controls[0])).toBe(title.parent!.children.indexOf(title) + 1);
    expect(tree.root.findByProps({ children: buffalo.fatherId })).toBeDefined();
    expect(tree.root.findByProps({ children: buffalo.motherId })).toBeDefined();
    renderer.act(() => tree.root.findByType(Image).props.onLoad());
    const image = tree.root.findByType(Image); await pressCopy();
    expect(write).toHaveBeenCalledWith(buffalo.microchip);
    expect(tree.root.findByType(Image)).toBe(image);
    expect(mockRouter.back).not.toHaveBeenCalled(); expect(mockRouter.push).not.toHaveBeenCalled();
    expect(getCertCertificate).not.toHaveBeenCalled(); expect(getCertSummary).toHaveBeenCalledTimes(1); expect(mockPhotos.refresh).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the identity despite a failed reward lookup and retries only the reward section", async () => {
    jest.mocked(getCertRewards).mockRejectedValueOnce(new Error("private debug error"));
    await renderer.act(async () => { tree = renderer.create(React.createElement(CertDetailScreen)); });
    expect(tree.root.findByProps({ children: buffalo.name })).toBeDefined();
    const retry = tree.root.findByProps({ accessibilityLabel: "ลองโหลดรางวัลอีกครั้ง" });
    await renderer.act(async () => { await retry.props.onPress(); });
    expect(tree.root.findByProps({ children: "ยังไม่มีรางวัลในทะเบียน" })).toBeDefined();
    expect(getCertSummary).toHaveBeenCalledTimes(1);
    expect(getCertRewards).toHaveBeenCalledTimes(2);
    expect(getCertCertificate).not.toHaveBeenCalled();
  });

  it.each(["ios", "android"] as const)("shares the public link on %s while JPEG generation waits for a separate action", async (os) => {
    mockBuffalo = { ...buffalo, certificate: { microchip: buffalo.microchip } };
    jest.replaceProperty(Platform, "OS", os);
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "dismissedAction" });
    const expectedLink = "https://jaothui.com/api/seo/og?microchip=" + buffalo.microchip;
    const file = { microchip: buffalo.microchip, tokenId: "71", imageBase64: "YQ==", encoding: "base64", mimeType: "image/jpeg" };
    jest.mocked(getCertCertificate).mockResolvedValue(file);
    await renderer.act(async () => { tree = renderer.create(React.createElement(CertDetailScreen)); });
    const action = (label: string) => tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
    await renderer.act(async () => { action("แชร์ข้อมูลควาย"); });
    expect(share).toHaveBeenCalledWith(os === "ios" ? { url: expectedLink } : { message: expectedLink });
    expect(getCertCertificate).not.toHaveBeenCalled();
    expect(shareOrDownloadCertificate).not.toHaveBeenCalled();
    await renderer.act(async () => { action("คัดลอกลิงก์"); });
    expect(write).toHaveBeenCalledWith(expectedLink);
    await renderer.act(async () => { action("ดูรูปใบรับรอง"); action("ดูรูปใบรับรอง"); });
    expect(getCertCertificate).toHaveBeenCalledTimes(1);
    await renderer.act(async () => { action("แชร์รูปใบรับรอง"); });
    expect(shareOrDownloadCertificate).toHaveBeenCalledWith(file);
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("aborts the previous chip's pending certificate on navigation", async () => {
    mockBuffalo = { ...buffalo, certificate: { microchip: buffalo.microchip } };
    let finish!: (file: Awaited<ReturnType<typeof getCertCertificate>>) => void;
    jest.mocked(getCertCertificate).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await renderer.act(async () => { tree = renderer.create(React.createElement(CertDetailScreen)); });
    await renderer.act(async () => { void tree.root.findByProps({ accessibilityLabel: "ดูรูปใบรับรอง" }).props.onPress(); });
    const [, signal] = jest.mocked(getCertCertificate).mock.calls[0];
    mockBuffalo = { ...buffalo, name: "ตัวใหม่", microchip: "000040226601199" };
    await renderer.act(async () => { tree.update(React.createElement(CertDetailScreen)); });
    expect(signal?.aborted).toBe(true);
    await renderer.act(async () => { finish({ microchip: buffalo.microchip, tokenId: "71", mimeType: "image/jpeg", encoding: "base64", imageBase64: "YQ==" }); });
    expect(tree.root.findByProps({ children: "ตัวใหม่" })).toBeDefined();
    expect(tree.root.findByProps({ children: "ยังไม่มีรูปใบรับรองในทะเบียน" })).toBeDefined();
    expect(tree.root.findAllByType(Image).every(node => !String(node.props.source?.uri).startsWith("data:"))).toBe(true);
  });

  it("a detail identity change clears earlier copy feedback", async () => {
    await renderer.act(async () => { tree = renderer.create(React.createElement(CertDetailScreen)); }); await pressCopy();
    mockBuffalo = { ...buffalo, microchip: "000040226601199", tokenId: 99 };
    await renderer.act(async () => { tree.update(React.createElement(CertDetailScreen)); });
    expect(copy(mockBuffalo.microchip).props.accessibilityValue.text).toBe("แตะเพื่อคัดลอก");
  });
});
