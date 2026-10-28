import { createPhotoManager, PHOTO_LIMIT, type PickedPhoto } from "../photos";
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const image: PickedPhoto = { uri: "file:///picked.heic", width: 3000, height: 2000 };
const jpeg = new Uint8Array([255, 216, 255, 1, 2, 3]);
function harness() {
  let current = true;
  const deps = { select: jest.fn(async () => image as PickedPhoto | null), normalize: jest.fn(async () => ({ ...image, uri: "file:///normalized.jpg" })), bytes: jest.fn(async () => jpeg), upload: jest.fn(async () => ({ assetId: "image-aaa-100x100-jpg" })), current: async () => current, changed: jest.fn() };
  return { deps, manager: createPhotoManager(deps), switchAccount: () => { current = false; } };
}
describe("five-photo native workflow coordinator", () => {
  it("preserves an existing image on picker cancel and permission denial", async () => {
    const h = harness(); await h.manager.choose(0, false); const saved = h.manager.slots[0];
    h.deps.select.mockResolvedValueOnce(null); await h.manager.choose(0, false); expect(h.manager.slots[0]).toEqual(saved);
    h.deps.select.mockRejectedValueOnce(new Error("ยังไม่ได้อนุญาตกล้อง")); await h.manager.choose(0, true);
    expect(h.manager.slots[0]).toMatchObject({ uri: saved.uri, assetId: saved.assetId, status: "error", error: "ยังไม่ได้อนุญาตกล้อง" });
  });
  it("retains normalizedURI through partial uploadfailure and retries only that slot", async () => {
    const h = harness(); h.deps.upload.mockRejectedValueOnce(new Error("network failed")); await h.manager.choose(0, false);
    expect(h.manager.slots[0]).toMatchObject({ uri: "file:///normalized.jpg", status: "error" });
    await h.manager.retry(0); expect(h.manager.slots[0].status).toBe("ready"); expect(h.deps.normalize).toHaveBeenCalledTimes(1); expect(h.deps.select).toHaveBeenCalledTimes(1); expect(h.manager.slots.slice(1).every(s => s.status === "empty")).toBe(true);
  });
  it("discards late upload after remove/replace or account switch", async () => {
    const h = harness(), old = deferred<{ assetId: string }>(); h.deps.upload.mockReturnValueOnce(old.promise);
    const first = h.manager.choose(0, false); for (let i = 0; i < 12; i++) await Promise.resolve();
    h.manager.remove(0); h.deps.upload.mockResolvedValueOnce({ assetId: "image-bbb-100x100-jpg" }); await h.manager.choose(0, false);
    old.resolve({ assetId: "image-stale-100x100-jpg" }); await first; expect(h.manager.slots[0].assetId).toBe("image-bbb-100x100-jpg");
    const next = deferred<{ assetId: string }>(); h.deps.upload.mockReturnValueOnce(next.promise); const pending = h.manager.choose(1, false); for (let i = 0; i < 12; i++) await Promise.resolve(); h.switchAccount(); next.resolve({ assetId: "image-old-account-100x100-jpg" }); await pending; expect(h.manager.slots[1].assetId).toBeUndefined();
  });
  it("refuses duplicateassets/oversize/invalidbytes and synchronous doublepicker taps", async () => {
    const h = harness(), picked = deferred<PickedPhoto | null>(); h.deps.select.mockReturnValueOnce(picked.promise);
    const first = h.manager.choose(0, false); await h.manager.choose(0, true); expect(h.deps.select).toHaveBeenCalledTimes(1); picked.resolve(image); await first;
    await h.manager.choose(1, false); expect(h.manager.slots[1]).toMatchObject({ status: "error", error: expect.stringContaining("ซ้ำ") });
    h.deps.bytes.mockResolvedValueOnce(new Uint8Array(PHOTO_LIMIT + 1)); await h.manager.choose(2, false); expect(h.manager.slots[2].error).toContain("4 MiB");
    h.deps.bytes.mockResolvedValueOnce(new Uint8Array([1, 2, 3])); await h.manager.choose(3, false); expect(h.manager.slots[3].status).toBe("error");
  });
});
