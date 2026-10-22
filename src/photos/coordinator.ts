import { approvedPhotoUrl, MAX_PHOTOS, validMicrochip, validPhotoToken, type PhotoDisplay, type PhotoEntry, type PhotoResult } from "./contract";

export const PHOTO_MIN_AGE_MS = 30_000;
export const PHOTO_MANUAL_COOLDOWN_MS = 1500;
const FAILURE_BACKOFF_MS = 5000;
export type PhotoSnapshot = { photos: ReadonlyMap<string, PhotoDisplay>; refreshing: boolean; status: "idle" | "success" | "unavailable" };

/** Per opt-in screen; bounded current page only, never a catalog/global invalidation. */
export function createPhotoCoordinator(read: (ids: string[]) => Promise<PhotoResult[]>, now = Date.now) {
  let entries: PhotoEntry[] = [], generation = 0, active = false, disposed = false;
  let checkedAt = 0, lastManual = -Infinity, retryAt = 0;
  let pending: Promise<void> | null = null;
  let snapshot: PhotoSnapshot = { photos: new Map(), refreshing: false, status: "idle" };
  const listeners = new Set<() => void>();
  const emit = (next: PhotoSnapshot) => { snapshot = next; listeners.forEach((listener) => listener()); };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    seed(input: readonly PhotoEntry[]) {
      generation++;
      const previous = new Map(entries.map((entry) => [entry.microchip, entry]));
      entries = input.slice(0, MAX_PHOTOS).filter((entry) => validMicrochip(entry.microchip));
      const photos = new Map<string, PhotoDisplay>();
      for (const entry of entries) {
        const old = previous.get(entry.microchip);
        // A delayed/recreated unchanged metadata A must not roll back photo-only B.
        const retained = old?.imageUrl === entry.imageUrl && old?.photoTokenId === entry.photoTokenId ? snapshot.photos.get(entry.microchip) : null;
        photos.set(entry.microchip, retained ?? { uri: entry.imageUrl, retry: 0 });
      }
      if (!previous.size || entries.some((entry) => previous.get(entry.microchip)?.imageUrl !== entry.imageUrl)) checkedAt = now();
      retryAt = 0;
      emit({ photos, refreshing: false, status: "idle" });
    },
    setActive(value: boolean) {
      disposed = false;
      if (active && !value) { generation++; emit({ ...snapshot, refreshing: false }); }
      active = value;
    },
    refresh(manual = false): Promise<void> {
      if (disposed || !active || !entries.length) return Promise.resolve();
      if (pending) return pending;
      const at = now();
      if (at < retryAt || (manual ? at - lastManual < PHOTO_MANUAL_COOLDOWN_MS : at - checkedAt < PHOTO_MIN_AGE_MS)) return Promise.resolve();
      if (manual) lastManual = at;
      const requestGeneration = generation;
      const ids = [...new Set(entries.map((entry) => entry.microchip))];
      emit({ ...snapshot, refreshing: true });
      const current = () => !disposed && active && requestGeneration === generation;
      pending = read(ids).then((results) => {
        if (!current()) return;
        const photos = new Map(snapshot.photos);
        let complete = true;
        for (const id of ids) {
          const matches = results.filter((result) => result.microchip === id);
          const result = matches.length === 1 ? matches[0] : null;
          const expected = entries.find((entry) => entry.microchip === id)?.photoTokenId;
          // Unavailable, mismatched or duplicate public identities never clear good data.
          if (!result || result.status !== "ready" || !validPhotoToken(result.tokenId) ||
            (expected !== undefined && (!validPhotoToken(expected) || expected !== result.tokenId)) || !approvedPhotoUrl(result.imageUrl)) {
            complete = false; continue;
          }
          photos.set(id, { uri: result.imageUrl, retry: (photos.get(id)?.retry ?? 0) + 1 });
        }
        if (complete) { checkedAt = now(); retryAt = 0; }
        else retryAt = now() + FAILURE_BACKOFF_MS;
        emit({ photos, refreshing: false, status: complete ? "success" : "unavailable" });
      }).catch(() => {
        if (current()) { retryAt = now() + FAILURE_BACKOFF_MS; emit({ ...snapshot, refreshing: false, status: "unavailable" }); }
      }).finally(() => {
        pending = null;
        if (!disposed && snapshot.refreshing) emit({ ...snapshot, refreshing: false });
      });
      return pending;
    },
    dispose() { disposed = true; generation++; listeners.clear(); },
  };
}
