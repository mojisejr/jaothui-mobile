import * as SecureStore from "expo-secure-store";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { secureStorageCall } from "@/auth/storageErrors";
import { serializeNotificationWrite } from "./serial";

export const INVITATION_DISMISSAL_KEY = "jaothui.push.invitationDismissal.v1";
export const INVITATION_DISMISSAL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ACCOUNTS = 8;
type Dismissal = { accountId: string; until: number };
async function read(storage: SecureStoreAdapter, now: number): Promise<Dismissal[]> {
  const raw = await secureStorageCall(() => storage.getItemAsync(INVITATION_DISMISSAL_KEY));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_ACCOUNTS) return [];
    return parsed.filter((item): item is Dismissal => !!item && typeof item === "object" &&
      typeof item.accountId === "string" && item.accountId.length > 0 && item.accountId.length <= 256 &&
      typeof item.until === "number" && Number.isFinite(item.until) && item.until > now && item.until <= now + INVITATION_DISMISSAL_MS);
  } catch { return []; }
}
export async function invitationDismissed(accountId: string, storage: SecureStoreAdapter = SecureStore, now = Date.now()) {
  return (await read(storage, now)).some(item => item.accountId === accountId);
}
export async function dismissInvitation(accountId: string, guard: () => void, storage: SecureStoreAdapter = SecureStore, now = Date.now()) {
  if (!accountId || accountId.length > 256) throw new Error("ไม่พบบัญชีปัจจุบัน");
  return serializeNotificationWrite(async () => {
    const previous = await read(storage, now);
    guard();
    const next = [...previous.filter(item => item.accountId !== accountId), { accountId, until: now + INVITATION_DISMISSAL_MS }].slice(-MAX_ACCOUNTS);
    await secureStorageCall(() => storage.setItemAsync(INVITATION_DISMISSAL_KEY, JSON.stringify(next)));
    guard();
  });
}
