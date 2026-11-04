import * as SecureStore from "expo-secure-store";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { secureStorageCall } from "@/auth/storageErrors";
import { revokeNotificationInstallation, type Revocation } from "./api";
import { BINDING_KEY, readBinding, readRevocations, writeRevocations } from "./storage";
import { serializeNotificationWrite } from "./serial";

type Revoke = (input: Revocation) => Promise<unknown>;
async function queueRevocation(item: Revocation, storage: SecureStoreAdapter) {
  const pending = await readRevocations(storage);
  if (!pending.some(old => old.revocationToken === item.revocationToken)) pending.push(item);
  await writeRevocations(pending, storage);
}
export const queueNotificationRevocation = (item: Revocation, storage: SecureStoreAdapter = SecureStore) => serializeNotificationWrite(() => queueRevocation(item, storage));
// Only disable-only capabilities survive logout; never retain the account session.
async function flush(storage: SecureStoreAdapter, revoke: Revoke) {
  const pending = await readRevocations(storage);
  const failed: Revocation[] = [];
  for (const item of pending) {
    try { await revoke(item); } catch { failed.push(item); }
  }
  await writeRevocations(failed, storage);
  return failed.length === 0;
}
export const flushNotificationRevocations = (storage: SecureStoreAdapter = SecureStore, revoke: Revoke = revokeNotificationInstallation) => serializeNotificationWrite(() => flush(storage, revoke));
async function revokeCurrent(storage: SecureStoreAdapter, revoke: Revoke) {
  const binding = await readBinding(storage);
  if (binding) {
    await queueRevocation({ installationId: binding.installationId, revocationToken: binding.revocationToken }, storage);
    await secureStorageCall(() => storage.deleteItemAsync(BINDING_KEY));
  }
  return flush(storage, revoke);
}
export const revokeCurrentNotificationBinding = (storage: SecureStoreAdapter = SecureStore, revoke: Revoke = revokeNotificationInstallation) => serializeNotificationWrite(() => revokeCurrent(storage, revoke));
export async function revokeStaleNotificationCapability(item: Revocation, storage: SecureStoreAdapter = SecureStore, revoke: Revoke = revokeNotificationInstallation) {
  return serializeNotificationWrite(async () => {
    await queueRevocation(item, storage);
    if ((await readBinding(storage))?.revocationToken === item.revocationToken) await secureStorageCall(() => storage.deleteItemAsync(BINDING_KEY));
    return flush(storage, revoke);
  });
}
export async function prepareNotificationAccount(accountId: string | null, storage: SecureStoreAdapter = SecureStore, guard: () => void = () => undefined) {
  return serializeNotificationWrite(async () => {
    const binding = await readBinding(storage);
    guard();
    if (binding && binding.accountId !== accountId) await revokeCurrent(storage, revokeNotificationInstallation);
  });
}
