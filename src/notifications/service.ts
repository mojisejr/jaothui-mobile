import * as SecureStore from "expo-secure-store";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { loadMobileSession } from "@/auth/sessionStorage";
import { currentSessionGeneration } from "@/auth/sessionLifecycle";
import type { MobileSession } from "@/types/mobile-api";
import { bindNotificationInstallation, getNotificationStatus, type NotificationBinding } from "./api";
import { flushNotificationRevocations, prepareNotificationAccount, revokeStaleNotificationCapability } from "./lifecycle";
import { installationId, readBinding, readRevocations, writeBinding } from "./storage";
import { nativePushSupported, notificationPlatform, readExpoPushToken, readNotificationPermission, requestNotificationPermission } from "./native";

export type NotificationState = "loading" | "unavailable" | "paused" | "pending-disable" | "unsupported" | "disabled" | "enabled" | "blocked" | "saving" | "error";
export type NotificationSession = MobileSession & { identity: { sessionVersion: 2; accountId: string } };
export function notificationAccount(session: MobileSession | null): string | null {
  return session?.identity.sessionVersion === 2 && (session.identity.provider === "line" || session.identity.provider === "apple") ? session.identity.accountId : null;
}
type Dependencies = {
  storage: SecureStoreAdapter;
  supported: typeof nativePushSupported;
  permission: typeof readNotificationPermission;
  requestPermission: typeof requestNotificationPermission;
  token: typeof readExpoPushToken;
  platform: typeof notificationPlatform;
  getStatus: typeof getNotificationStatus;
  bind: typeof bindNotificationInstallation;
  generation: typeof currentSessionGeneration;
  currentSession: () => Promise<MobileSession | null>;
};
const defaults: Dependencies = { storage: SecureStore, supported: nativePushSupported, permission: readNotificationPermission, requestPermission: requestNotificationPermission, token: readExpoPushToken, platform: notificationPlatform, getStatus: getNotificationStatus, bind: bindNotificationInstallation, generation: currentSessionGeneration, currentSession: loadMobileSession };
export function createNotificationService(overrides: Partial<Dependencies> = {}) {
  const deps = { ...defaults, ...overrides };
  const assertCurrent = (generation: number) => { if (generation !== deps.generation()) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาลองใหม่"); };
  const checked = async <T,>(task: Promise<T>, generation: number) => { const value = await task; assertCurrent(generation); return value; };
  const verifySession = async (session: MobileSession, generation: number) => {
    const current = await checked(deps.currentSession(), generation);
    if (!current || current.sessionToken !== session.sessionToken || notificationAccount(current) !== notificationAccount(session)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาลองใหม่");
  };
  const persist = async (binding: NotificationBinding, generation: number) => {
    try { await writeBinding(binding, deps.storage, () => assertCurrent(generation)); }
    catch (error) { await revokeStaleNotificationCapability(binding, deps.storage); throw error; }
  };
  async function status(session: MobileSession): Promise<NotificationState> {
    if (!notificationAccount(session)) return "unavailable";
    if (!deps.supported()) return "unsupported";
    const generation = deps.generation();
    await verifySession(session, generation);
    if ((await checked(readRevocations(deps.storage), generation)).length) return "pending-disable";
    const id = await checked(installationId(deps.storage), generation);
    const remote = await checked(deps.getStatus(id, session.sessionToken), generation);
    if (!remote.available) {
      const local = await checked(readBinding(deps.storage), generation);
      return local?.accountId === notificationAccount(session) ? "paused" : "unavailable";
    }
    const permission = await checked(deps.permission(), generation);
    if (permission === "denied") return "blocked";
    const binding = await checked(readBinding(deps.storage), generation);
    return permission === "granted" && remote.enabled && binding?.accountId === notificationAccount(session) &&
      binding.installationId === id && binding.bindingGeneration === remote.bindingGeneration ? "enabled" : "disabled";
  }
  async function enable(session: MobileSession): Promise<NotificationState> {
    const accountId = notificationAccount(session);
    if (!accountId || !deps.supported()) return "unsupported";
    const generation = deps.generation();
    await verifySession(session, generation);
    const id = await checked(installationId(deps.storage), generation);
    const remote = await checked(deps.getStatus(id, session.sessionToken), generation);
    if (!remote.available) return "unavailable"; // Never prompt while the server switch is off.
    const permission = await checked(deps.requestPermission(), generation);
    if (permission !== "granted") return "blocked";
    await checked(prepareNotificationAccount(accountId, deps.storage, () => assertCurrent(generation)), generation);
    if (!await checked(flushNotificationRevocations(deps.storage), generation)) throw new Error("ยังปิดการแจ้งเตือนบัญชีเดิมไม่สำเร็จ กรุณาลองใหม่");
    const expoPushToken = await checked(deps.token(), generation);
    const saved = await deps.bind({ installationId: id, platform: deps.platform(), expoPushToken }, session.sessionToken);
    const binding: NotificationBinding = { installationId: id, accountId, bindingGeneration: saved.bindingGeneration, revocationToken: saved.revocationToken, expoPushToken };
    if (generation !== deps.generation()) {
      // A late successful bind must be revoked, never attached to the new session.
      await revokeStaleNotificationCapability(binding, deps.storage);
      throw new Error("บัญชีเปลี่ยนแล้ว กรุณาลองใหม่");
    }
    await persist(binding, generation);
    return "enabled";
  }
  async function refresh(session: MobileSession) {
    const generation = deps.generation();
    await verifySession(session, generation);
    const binding = await checked(readBinding(deps.storage), generation);
    if (!binding || !deps.supported()) return;
    await checked(prepareNotificationAccount(notificationAccount(session), deps.storage, () => assertCurrent(generation)), generation);
    if (binding.accountId !== notificationAccount(session)) return;
    if (await checked(deps.permission(), generation) !== "granted") { await revokeStaleNotificationCapability(binding, deps.storage); return; }
    const remote = await checked(deps.getStatus(binding.installationId, session.sessionToken), generation);
    if (!remote.available) return;
    const expoPushToken = await checked(deps.token(), generation);
    if (expoPushToken !== binding.expoPushToken || !remote.enabled || remote.bindingGeneration !== binding.bindingGeneration) await enableWithoutPrompt(session, expoPushToken, binding, generation);
  }
  async function enableWithoutPrompt(session: MobileSession, expoPushToken: string, binding: NotificationBinding, generation: number) {
    const saved = await deps.bind({ installationId: binding.installationId, platform: deps.platform(), expoPushToken }, session.sessionToken);
    if (generation !== deps.generation()) {
      await revokeStaleNotificationCapability({ installationId: binding.installationId, revocationToken: saved.revocationToken }, deps.storage);
      return;
    }
    await persist({ ...binding, expoPushToken, bindingGeneration: saved.bindingGeneration, revocationToken: saved.revocationToken }, generation);
  }
  async function disable(session: MobileSession) {
    const generation = deps.generation();
    const binding = await checked(readBinding(deps.storage), generation);
    if (!binding) return flushNotificationRevocations(deps.storage);
    if (binding.accountId !== notificationAccount(session)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาลองใหม่");
    return revokeStaleNotificationCapability(binding, deps.storage);
  }
  return { status, enable, refresh, disable };
}
export const notificationService = createNotificationService();
