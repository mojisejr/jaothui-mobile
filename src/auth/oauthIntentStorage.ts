import * as SecureStore from "expo-secure-store";
import type { MobileSession } from "@/types/mobile-api";
import type { SecureStoreAdapter } from "./sessionStorage";

import { MobileSessionStorageError, secureStorageCall, SECURE_STORAGE_ERROR_MESSAGE } from "./storageErrors";

export const OAUTH_INTENT_KEY = "jaothui.oauthIntent.v1";
export const OAUTH_INTENT_TTL_MS = 10 * 60 * 1000;
export type OAuthIntent = {
  flowId: string;
  kind: "login" | "link";
  eventId: string | null;
  expectedIdentity: string;
  serverIntentId?: string;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "completed";
  completedAccountId?: string;
};
export function sessionIdentity(session: MobileSession | null): string {
  if (!session) return "guest";
  return session.identity.sessionVersion === 2 ? `account:${session.identity.accountId}` : `wallet:${session.identity.walletAddress.toLowerCase()}`;
}
export function validEventId(value: string) { return /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(value) && !value.includes("..") && !/^(drafts|versions|_)\./.test(value); }
export async function readOAuthIntent(storage: SecureStoreAdapter = SecureStore, now = Date.now()): Promise<OAuthIntent | null> {
  const raw = await secureStorageCall(() => storage.getItemAsync(OAUTH_INTENT_KEY));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as OAuthIntent;
    if (!/^[a-zA-Z0-9-]{12,96}$/.test(value.flowId) || !["login", "link"].includes(value.kind) || !["pending", "completed"].includes(value.status) ||
      typeof value.expectedIdentity !== "string" || typeof value.createdAt !== "number" || typeof value.expiresAt !== "number" ||
      value.createdAt > now || value.expiresAt <= now || value.expiresAt - value.createdAt > OAUTH_INTENT_TTL_MS ||
      !(value.eventId === null || (typeof value.eventId === "string" && validEventId(value.eventId)))) return null;
    return value;
  } catch { return null; }
}
export async function writeOAuthIntent(intent: OAuthIntent, storage: SecureStoreAdapter = SecureStore) {
  if (storage.isAvailableAsync && !(await secureStorageCall(() => storage.isAvailableAsync!()))) throw new MobileSessionStorageError(SECURE_STORAGE_ERROR_MESSAGE);
  await secureStorageCall(() => storage.setItemAsync(OAUTH_INTENT_KEY, JSON.stringify(intent)));
}
export async function eraseOAuthIntent(storage: SecureStoreAdapter = SecureStore) {
  // Avoid extra writes when no valid intent exists (including old session-only adapters).
  if (await secureStorageCall(() => storage.getItemAsync(OAUTH_INTENT_KEY))) await secureStorageCall(() => storage.deleteItemAsync(OAUTH_INTENT_KEY));
}
