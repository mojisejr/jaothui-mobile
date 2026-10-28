export const PHOTO_LIMIT = 4 * 1024 * 1024;
export const photoTitles = ["ภาพบัตรประจำตัวสัตว์ (ภาพที่ 1)", "ภาพบัตรประจำตัวสัตว์ (ภาพที่ 2)", "ภาพถ่ายหน้าตรงกระบือ", "ภาพถ่ายด้านข้างกระบือ", "ภาพถ่ายด้านท้ายกระบือ"] as const;
export type PickedPhoto = { uri: string; width: number; height: number };
export type PhotoSlot = { uri?: string; assetId?: string; status: "empty" | "preparing" | "uploading" | "ready" | "error"; error?: string };
export const emptyPhotos = (): PhotoSlot[] => photoTitles.map(() => ({ status: "empty" }));
export function createPhotoManager(deps: {
  select: (camera: boolean) => Promise<PickedPhoto | null>; normalize: (photo: PickedPhoto) => Promise<PickedPhoto>;
  bytes: (uri: string) => Promise<Uint8Array>; upload: (bytes: Uint8Array) => Promise<{ assetId: string }>;
  current: () => Promise<boolean>; changed: (slots: PhotoSlot[]) => void;
}, initial = emptyPhotos()) {
  let slots = initial.map(slot => slot.status === "uploading" || slot.status === "preparing" ? { ...slot, status: "error" as const, error: "กรุณาลองอัปโหลดภาพอีกครั้ง" } : { ...slot });
  const versions = photoTitles.map(() => 0), busy = new Set<number>();
  const update = (index: number, patch: Partial<PhotoSlot>) => { slots = slots.map((slot, i) => i === index ? { ...slot, ...patch } : slot); deps.changed(slots); };
  const valid = async (index: number, version: number) => versions[index] === version && await deps.current();
  async function upload(index: number, version: number) {
    const uri = slots[index].uri;
    if (!uri) return;
    update(index, { status: "uploading", error: undefined, assetId: undefined });
    const bytes = await deps.bytes(uri);
    if (bytes.length > PHOTO_LIMIT || bytes.length < 3 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error("ภาพต้องเป็น JPEG ที่ถูกต้องและมีขนาดไม่เกิน 4 MiB");
    if (!await valid(index, version)) return;
    const result = await deps.upload(bytes);
    if (!await valid(index, version)) return;
    if (slots.some((slot, i) => i !== index && slot.assetId === result.assetId)) throw new Error("ภาพนี้ซ้ำกับช่องอื่น กรุณาเลือกภาพที่แตกต่างกัน");
    update(index, { status: "ready", assetId: result.assetId, error: undefined });
  }
  return {
    get slots() { return slots; },
    remove(index: number) { versions[index]++; busy.delete(index); slots = slots.map((slot, i) => i === index ? { status: "empty" } : slot); deps.changed(slots); },
    async choose(index: number, camera: boolean) {
      if (busy.has(index)) return;
      busy.add(index); const version = ++versions[index], previous = { ...slots[index] };
      try {
        const selected = await deps.select(camera);
        if (!selected || !await valid(index, version)) return;
        update(index, { status: "preparing", error: undefined });
        const normalized = await deps.normalize(selected);
        if (!await valid(index, version)) return;
        update(index, { uri: normalized.uri, assetId: undefined });
        await upload(index, version);
      } catch (error) { if (await valid(index, version)) update(index, { uri: slots[index].uri ?? previous.uri, status: "error", error: error instanceof Error ? error.message : "เตรียมภาพไม่สำเร็จ" }); }
      finally { if (versions[index] === version) busy.delete(index); }
    },
    async retry(index: number) {
      if (busy.has(index) || !slots[index].uri) return;
      busy.add(index); const version = ++versions[index];
      try { await upload(index, version); }
      catch (error) { if (await valid(index, version)) update(index, { status: "error", error: error instanceof Error ? error.message : "อัปโหลดไม่สำเร็จ" }); }
      finally { if (versions[index] === version) busy.delete(index); }
    },
  };
}
