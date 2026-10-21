import { createPhotoCoordinator, PHOTO_MIN_AGE_MS } from "../coordinator";
import { createCandidateQueue } from "../candidateQueue";
import { approvedPhotoUrl, parsePhotoResults, photoMicrochips, validPhotoToken, type PhotoResult } from "../contract";

const base = "https://wtnqjxerhmdnqszkhbvs.supabase.co/storage/v1/object/public/slipstorage/buffalo/";
const a = `${base}71.jpg?cacheNonce=a`, b = `${base}71.jpg?cacheNonce=b`, id = "764040226600001";
const result = (imageUrl = b, microchip = id): PhotoResult => ({ microchip, tokenId: "9007199254740993", status: "ready", imageUrl, sourceKey: imageUrl });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function setup(read: (ids: string[]) => Promise<PhotoResult[]> = jest.fn(async () => [result()])) {
  let clock = 1000;
  const coordinator = createPhotoCoordinator(read, () => clock);
  coordinator.seed([{ microchip: id, imageUrl: a }]); coordinator.setActive(true);
  return { coordinator, read, advance: (ms = PHOTO_MIN_AGE_MS) => { clock += ms; } };
}

describe("photo-only coordinator", () => {
  it("does not immediately duplicate initial metadata; no timer exists; 30s is a minimum age", async () => {
    const { coordinator, read, advance } = setup();
    await coordinator.refresh(); advance(29_999); await coordinator.refresh(); expect(read).not.toHaveBeenCalled();
    advance(1); await coordinator.refresh(); expect(read).toHaveBeenCalledTimes(1);
    expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(b);
    await coordinator.refresh(); expect(read).toHaveBeenCalledTimes(1);
  });
  it("coalesces focus/foreground/manual bursts into one bounded request; cooldown", async () => {
    const task = deferred<PhotoResult[]>(), read = jest.fn(() => task.promise);
    const { coordinator, advance } = setup(read); advance();
    const first = coordinator.refresh(); coordinator.setActive(true);
    expect(coordinator.refresh()).toBe(first); expect(coordinator.refresh(true)).toBe(first);
    task.resolve([result()]); await first; expect(read).toHaveBeenCalledWith([id]);
    await coordinator.refresh(true); await coordinator.refresh(true); expect(read).toHaveBeenCalledTimes(2);
  });
  it("manual bypasses freshness age, not inactive/background or backoff", async () => {
    const read = jest.fn(async () => { throw new Error("404 older backend/offline"); });
    const { coordinator, advance } = setup(read);
    coordinator.setActive(false); await coordinator.refresh(true); expect(read).not.toHaveBeenCalled();
    coordinator.setActive(true); await coordinator.refresh(true);
    expect(coordinator.getSnapshot()).toMatchObject({ status: "unavailable", refreshing: false });
    expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(a);
    await coordinator.refresh(true); expect(read).toHaveBeenCalledTimes(1);
    advance(5000); await coordinator.refresh(true); expect(read).toHaveBeenCalledTimes(2);
  });
  it("background and dispose ignore an already running response", async () => {
    const task = deferred<PhotoResult[]>(), { coordinator } = setup(jest.fn(() => task.promise));
    const first = coordinator.refresh(true); coordinator.setActive(false); task.resolve([result()]); await first;
    expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(a);
    coordinator.dispose(); await coordinator.refresh(true); expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(a);
  });
  it("metadata/page/identity generation beats an old request", async () => {
    const task = deferred<PhotoResult[]>(), { coordinator } = setup(jest.fn(() => task.promise));
    const first = coordinator.refresh(true);
    coordinator.seed([{ microchip: "764040226600002", imageUrl: null }]); task.resolve([result()]); await first;
    expect(coordinator.getSnapshot().photos.size).toBe(1);
    expect(coordinator.getSnapshot().photos.get(id)).toBeUndefined();
    expect(coordinator.getSnapshot().photos.get("764040226600002")?.uri).toBeNull();
  });
  it("a late unchanged metadata A does not roll back successful B; changed C remains authoritative", async () => {
    const { coordinator } = setup(); await coordinator.refresh(true);
    coordinator.seed([{ microchip: id, imageUrl: a }]); expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(b);
    coordinator.seed([{ microchip: id, imageUrl: `${base}71.jpg?cacheNonce=c` }]);
    expect(coordinator.getSnapshot().photos.get(id)?.uri).toContain("cacheNonce=c");
  });
  it.each(([
    [result(b, "764040226600002")], [result(), result()], [{ ...result(), status: "unavailable" }],
    [{ ...result(), status: "fallback" }], [{ ...result(), imageUrl: "https://evil.invalid/x.jpg" }],
    [{ ...result(), tokenId: "9007199254740992" }],
  ] as PhotoResult[][]).map((value) => ({ value })))("untrusted/ambiguous/fallback results retain good data and do not mark freshness success (%j)", async ({ value }) => {
    const { coordinator, read, advance } = setup(jest.fn(async () => value));
    coordinator.seed([{ microchip: id, imageUrl: a, photoTokenId: "9007199254740993" }]);
    await coordinator.refresh(true); expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(a);
    expect(coordinator.getSnapshot().status).toBe("unavailable");
    advance(); await coordinator.refresh(); expect(read).toHaveBeenCalledTimes(2);
  });
  it("bounds current page to 40 IDs and drops prior-page entries; duplicate microchips dedup", async () => {
    const { coordinator, read } = setup();
    coordinator.seed(Array.from({ length: 80 }, (_, i) => ({ microchip: String(100 + i), imageUrl: a })));
    await coordinator.refresh(true); expect((read as jest.Mock).mock.calls[0][0]).toHaveLength(40);
    expect(coordinator.getSnapshot().photos.size).toBe(40);
  });
  it("subscribe cleanup and explicit activation support React effect replay", async () => {
    const { coordinator } = setup(); const listener = jest.fn(), remove = coordinator.subscribe(listener);
    remove(); coordinator.dispose(); coordinator.setActive(true); await coordinator.refresh(true);
    expect(coordinator.getSnapshot().photos.get(id)?.uri).toBe(b); expect(listener).not.toHaveBeenCalled();
  });
});

describe("native photo transport and bounded decode", () => {
  it("caps raw selectors before dedup and keeps exact strings beyond JS number range", () => {
    expect(() => photoMicrochips(Array(41).fill(id))).toThrow();
    expect(photoMicrochips([id, id])).toEqual([id]);
    expect(validPhotoToken("9007199254740993")).toBe(true);
    expect(validPhotoToken("9223372036854775808")).toBe(false);
    expect(validPhotoToken(9007199254740993)).toBe(false);
  });
  it("rejects private/foreign/executable/doubled extension/encoded escape/query secrets", () => {
    expect(approvedPhotoUrl(a)).toBe(true);
    for (const url of [a.replace("https:", "http:"), `${base}71.jpg.jpg`, `${base}%2e%2e/private.jpg`, `${base}71.jpg?token=secret`, `${base}71.svg`, `${base}71.jpg#x`]) expect(approvedPhotoUrl(url)).toBe(false);
    expect(parsePhotoResults({ photos: [result(), { ...result(), microchip: "bad" }] })).toHaveLength(1);
    expect(() => parsePhotoResults({ photos: Array(41).fill(result()) })).toThrow();
  });
  it("supports the installed React Native URL polyfill, not only Node/browser URL", () => {
    const originalURL = global.URL;
    const originalFixture = process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NativeURL = require("react-native/Libraries/Blob/URL").URL as typeof URL;
    try {
      global.URL = NativeURL;
      expect(approvedPhotoUrl(`${base}71.jpg`)).toBe(true);
      expect(approvedPhotoUrl(a)).toBe(true);
      expect(approvedPhotoUrl(`${base}71.jpg?v`)).toBe(false);
      expect(approvedPhotoUrl("http://127.0.0.1:3120/media/A.jpg")).toBe(false);
      process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL = "http://127.0.0.1:3120";
      expect(approvedPhotoUrl("http://127.0.0.1:3120/media/A.jpg")).toBe(true);
      expect(approvedPhotoUrl("http://127.0.0.1:9999/media/A.jpg")).toBe(false);
      expect(approvedPhotoUrl("http://127.0.0.1:3120/media/%2e%2e/A.jpg")).toBe(false);
    } finally {
      global.URL = originalURL;
      if (originalFixture === undefined) delete process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL;
      else process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL = originalFixture;
    }
  });
  it("at most four mounted candidates run; cancellation and load release are idempotent", () => {
    const queue = createCandidateQueue(), starts = Array.from({ length: 8 }, () => jest.fn());
    const releases = starts.map((start) => queue.acquire(start));
    expect(starts.filter((start) => start.mock.calls.length)).toHaveLength(4);
    releases[6](); releases[0](); releases[0](); expect(starts[4]).toHaveBeenCalledTimes(1);
    releases[1](); expect(starts[5]).toHaveBeenCalledTimes(1); releases[2](); expect(starts[7]).toHaveBeenCalledTimes(1);
    expect(starts[6]).not.toHaveBeenCalled(); releases.forEach((release) => release());
  });
});
