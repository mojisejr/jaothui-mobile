import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { secureStorageCall } from "@/auth/storageErrors";
import type { NotificationBinding, Revocation } from "./api";
import { serializeNotificationWrite } from "./serial";

export const INSTALLATION_KEY = "jaothui.push.installation.v1";
export const BINDING_KEY = "jaothui.push.binding.v1";
export const REVOCATIONS_KEY = "jaothui.push.revocations.v1";
export const isInstallationId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const isRevocation = (value: unknown): value is Revocation => !!value && typeof value === "object" &&
  isInstallationId((value as Revocation).installationId) && typeof (value as Revocation).revocationToken === "string" &&
  (value as Revocation).revocationToken.length >= 16 && (value as Revocation).revocationToken.length <= 2048;
export async function installationId(storage: SecureStoreAdapter = SecureStore): Promise<string> {
  return serializeNotificationWrite(async () => {
  const old = await secureStorageCall(() => storage.getItemAsync(INSTALLATION_KEY));
  if (isInstallationId(old)) return old;
  const id = randomUUID();
  await secureStorageCall(() => storage.setItemAsync(INSTALLATION_KEY, id));
  return id;
  });
}
export async function readBinding(storage: SecureStoreAdapter = SecureStore): Promise<NotificationBinding | null> {
  const raw = await secureStorageCall(() => storage.getItemAsync(BINDING_KEY));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as NotificationBinding;
    return isRevocation(value) && typeof value.accountId === "string" && !!value.accountId && Number.isSafeInteger(value.bindingGeneration) && value.bindingGeneration > 0 ? value : null;
  } catch { return null; }
}
export async function writeBinding(value: NotificationBinding, storage: SecureStoreAdapter = SecureStore, guard: () => void = () => undefined) {
  await serializeNotificationWrite(async () => {
    guard();
    await secureStorageCall(() => storage.setItemAsync(BINDING_KEY, JSON.stringify(value)));
    guard();
  });
}
export async function readRevocations(storage: SecureStoreAdapter = SecureStore): Promise<Revocation[]> {
  const raw = await secureStorageCall(() => storage.getItemAsync(REVOCATIONS_KEY));
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(item => !isRevocation(item))) throw new Error("ยังอ่านการปิดแจ้งเตือนที่ค้างอยู่ไม่ได้");
  return value;
}
export async function writeRevocations(value: Revocation[], storage: SecureStoreAdapter = SecureStore) {
  await secureStorageCall(() => storage.setItemAsync(REVOCATIONS_KEY, JSON.stringify(value)));
}
