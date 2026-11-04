import * as SecureStore from "expo-secure-store";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { validEventId } from "@/auth/oauthIntentStorage";
import { secureStorageCall } from "@/auth/storageErrors";

export const HISTORY_INTENT_KEY = "jaothui.push.historyIntent.v1";
export const HISTORY_INTENT_TTL_MS = 10 * 60 * 1000;
export type HistoryIntent = { eventId: string; createdAt: number; expiresAt: number; accountId: string | null };
export function parseReminderData(data: unknown): { eventId: string } | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  return input.kind === "competition-reminder" && typeof input.eventId === "string" && validEventId(input.eventId) &&
    (input.reminderId === undefined || (typeof input.reminderId === "string" && input.reminderId.length <= 256)) &&
    (input.expiresAt === undefined || (typeof input.expiresAt === "string" && Number.isFinite(Date.parse(input.expiresAt)))) &&
    Object.keys(input).every(key => ["kind", "eventId", "reminderId", "expiresAt"].includes(key)) ? { eventId: input.eventId } : null;
}
export const historyHref = (eventId: string) => `/registrations?eventId=${encodeURIComponent(eventId)}`;
export async function rememberHistoryIntent(eventId: string, accountId: string | null, storage: SecureStoreAdapter = SecureStore, now = Date.now()) {
  if (!validEventId(eventId)) return;
  const intent: HistoryIntent = { eventId, accountId, createdAt: now, expiresAt: now + HISTORY_INTENT_TTL_MS };
  await secureStorageCall(() => storage.setItemAsync(HISTORY_INTENT_KEY, JSON.stringify(intent)));
}
export async function readHistoryIntent(storage: SecureStoreAdapter = SecureStore, now = Date.now()): Promise<HistoryIntent | null> {
  const raw = await secureStorageCall(() => storage.getItemAsync(HISTORY_INTENT_KEY));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as HistoryIntent;
    if (typeof value.eventId === "string" && validEventId(value.eventId) && typeof value.createdAt === "number" && value.createdAt <= now &&
      typeof value.expiresAt === "number" && value.expiresAt > now && value.expiresAt - value.createdAt <= HISTORY_INTENT_TTL_MS &&
      (value.accountId === null || typeof value.accountId === "string")) return value;
  } catch { /* Corrupt/expired notification intents never become navigation URLs. */ }
  await eraseHistoryIntent(storage);
  return null;
}
export async function eraseHistoryIntent(storage: SecureStoreAdapter = SecureStore) {
  await secureStorageCall(() => storage.deleteItemAsync(HISTORY_INTENT_KEY));
}
export async function consumeHistoryIntent(accountId: string, storage: SecureStoreAdapter = SecureStore) {
  const intent = await readHistoryIntent(storage);
  if (!intent) return null;
  await eraseHistoryIntent(storage);
  return intent.accountId && intent.accountId !== accountId ? null : historyHref(intent.eventId);
}
