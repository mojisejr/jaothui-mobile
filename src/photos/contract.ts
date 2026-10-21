/** Public read-only photo identities. Never coerce the legacy numeric tokenId. */
export type PhotoResult = {
  tokenId: string;
  microchip?: string;
  status: "ready" | "fallback" | "unavailable";
  imageUrl?: string;
  sourceKey?: string;
};
export type PhotoEntry = { microchip: string; imageUrl: string | null; photoTokenId?: string };
export type PhotoDisplay = { uri: string | null; retry: number };
export const MAX_PHOTOS = 40;
export function validMicrochip(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{1,32}$/.test(value);
}
export function validPhotoToken(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= BigInt("9223372036854775807");
}
export function photoMicrochips(values: string[]): string[] {
  if (!values.length || values.length > MAX_PHOTOS || !values.every(validMicrochip)) throw new Error("INVALID_PHOTO_IDENTITIES");
  return [...new Set(values)].sort();
}

export function approvedPhotoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2600 || /[\\\s#]/.test(value)) return false;
  try {
    const url = new URL(value);
    // This existing explicitly selected local fixture transport is not a production
    // trust fallback. Only loopback media on its exact origin is admitted.
    const local = process.env.EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL;
    if (local) {
      const fixture = new URL(local);
      if (["localhost", "127.0.0.1"].includes(fixture.hostname) && fixture.protocol === "http:" &&
        url.origin === fixture.origin && /^\/media\/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/.test(value.slice(fixture.origin.length)) && !url.search && !url.username && !url.password) return true;
    }
    const prefix = "https://wtnqjxerhmdnqszkhbvs.supabase.co/storage/v1/object/public/slipstorage/";
    if (!value.startsWith(prefix) || url.username || url.password) return false;
    const parts = value.slice(prefix.length).split("?")[0].split("/").map(decodeURIComponent);
    if (parts.some((part) => !part || part === "." || part === ".." || /[\\/%\x00-\x1f\x7f]/.test(part))) return false;
    if (parts[0] !== "buffalo" && !(parts.length === 4 && parts[0] === "operations" &&
      /^[a-f0-9]{64}$/.test(parts[1]) && /^[a-f0-9-]{36}$/.test(parts[2]) && /^(source|published-image)\.jpg$/.test(parts[3]))) return false;
    if (!/\.(jpe?g|png|webp)$/i.test(parts.at(-1)!) || /\.(jpe?g|png|webp)\.(jpe?g|png|webp)$/i.test(parts.at(-1)!)) return false;
    if (url.search.length > 512) return false;
    const seen = new Set<string>();
    let valid = true;
    url.searchParams.forEach((entry, key) => {
      if (!["cacheNonce", "v", "version"].includes(key) || seen.has(key) || typeof entry !== "string" || !/^[a-zA-Z0-9._~-]{1,128}$/.test(entry)) valid = false;
      seen.add(key);
    });
    return valid;
  } catch { return false; }
}

export function parsePhotoResults(value: unknown): PhotoResult[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { photos?: unknown }).photos)) throw new Error("INVALID_PHOTO_RESPONSE");
  const photos = (value as { photos: unknown[] }).photos;
  if (photos.length > MAX_PHOTOS) throw new Error("INVALID_PHOTO_RESPONSE");
  return photos.filter((entry): entry is PhotoResult => {
    if (!entry || typeof entry !== "object") return false;
    const photo = entry as PhotoResult;
    return validMicrochip(photo.microchip) && validPhotoToken(photo.tokenId) &&
      (photo.status === "unavailable" || ((photo.status === "ready" || photo.status === "fallback") && approvedPhotoUrl(photo.imageUrl) &&
        typeof photo.sourceKey === "string" && photo.sourceKey.length > 0 && photo.sourceKey.length <= 3000));
  });
}
