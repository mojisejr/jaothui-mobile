import { createNotificationService } from "../service";
import { readBinding, writeBinding } from "../storage";
import { revokeNotificationInstallation } from "../api";
import type { MobileSession } from "@/types/mobile-api";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
jest.mock("expo-crypto", () => ({ randomUUID: () => "9a167970-8905-4ada-a3a2-208ec668d53d" }));
jest.mock("../native", () => ({ nativePushSupported: () => true, notificationPlatform: () => "android", readExpoPushToken: async () => "ExponentPushToken[test-token]", readNotificationPermission: async () => "granted", requestNotificationPermission: async () => "granted" }));
jest.mock("../api", () => ({ bindNotificationInstallation: jest.fn(), getNotificationStatus: jest.fn(), revokeNotificationInstallation: jest.fn(async () => ({ enabled: false })) }));
const session = { sessionToken: "account-session", identity: { provider: "line", sessionVersion: 2, accountId: "account-1" } } as MobileSession;
const fixture = () => {
  const values = new Map<string, string>();
  const storage: SecureStoreAdapter = { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value); }, deleteItemAsync: async key => { values.delete(key); } };
  const requestPermission = jest.fn(async () => "granted" as never);
  const getStatus = jest.fn(async () => ({ available: true, enabled: false, bindingGeneration: null }));
  const bind = jest.fn(async () => ({ available: true as const, enabled: true as const, bindingGeneration: 1, revocationToken: "disable-only-capability-1" }));
  let generation = 1;
  return { storage, requestPermission, getStatus, bind, generation: () => generation, currentSession: async () => session, advance: () => generation++, values };
};
describe("native notification opt-in truth", () => {
  it("does not ask OS permission or bind while server availability is off", async () => {
    const f = fixture(); f.getStatus.mockResolvedValue({ available: false, enabled: false, bindingGeneration: null });
    expect(await createNotificationService(f).enable(session)).toBe("unavailable");
    expect(f.requestPermission).not.toHaveBeenCalled(); expect(f.bind).not.toHaveBeenCalled();
  });
  it("keeps disable available for prior consent when registration is paused", async () => {
    const f = fixture(); const service = createNotificationService(f); await service.enable(session);
    f.getStatus.mockResolvedValue({ available: false, enabled: false, bindingGeneration: null });
    f.requestPermission.mockClear();
    expect(await service.status(session)).toBe("paused");
    expect(await service.disable(session)).toBe(true);
    expect(await readBinding(f.storage)).toBeNull(); expect(f.requestPermission).not.toHaveBeenCalled();
  });
  it("OS permission alone never becomes enabled if backend binding fails", async () => {
    const f = fixture(); f.bind.mockRejectedValue(new Error("unavailable"));
    await expect(createNotificationService(f).enable(session)).rejects.toThrow("unavailable");
    expect(await readBinding(f.storage)).toBeNull(); expect(await createNotificationService(f).status(session)).toBe("disabled");
  });
  it("only shows enabled after both backend binding and secure persistence", async () => {
    const f = fixture(); const service = createNotificationService(f);
    expect(await service.enable(session)).toBe("enabled");
    f.getStatus.mockResolvedValue({ available: true, enabled: true, bindingGeneration: 1 as never });
    expect(await service.status(session)).toBe("enabled");
    expect((await readBinding(f.storage))?.accountId).toBe("account-1");
  });
  it("does not show enabled for a stale local generation even when OS and server permit", async () => {
    const f = fixture(); const service = createNotificationService(f); await service.enable(session);
    f.getStatus.mockResolvedValue({ available: true, enabled: true, bindingGeneration: 2 as never });
    expect(await service.status(session)).toBe("disabled");
  });
  it("denied permission never binds and returns a settings state", async () => {
    const f = fixture(); f.requestPermission.mockResolvedValue("denied" as never);
    expect(await createNotificationService(f).enable(session)).toBe("blocked"); expect(f.bind).not.toHaveBeenCalled();
  });
  it("rejects a stale successful bind after account switch without overwriting a new binding", async () => {
    const f = fixture();
    f.bind.mockImplementation(async () => {
      f.advance(); await writeBinding({ installationId: "9a167970-8905-4ada-a3a2-208ec668d53d", accountId: "account-2", bindingGeneration: 2, revocationToken: "disable-only-capability-2" }, f.storage);
      return { available: true, enabled: true, bindingGeneration: 1, revocationToken: "disable-only-capability-1" };
    });
    await expect(createNotificationService(f).enable(session)).rejects.toThrow("บัญชีเปลี่ยนแล้ว");
    expect((await readBinding(f.storage))?.accountId).toBe("account-2");
  });
  it("does not let a refresh awaiting permission revoke or replace the newly switched account", async () => {
    const f = fixture(); await createNotificationService(f).enable(session);
    let resume!: (value: never) => void, entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const permission = () => { entered(); return new Promise<never>(resolve => { resume = resolve; }); };
    const pending = createNotificationService({ ...f, permission }).refresh(session);
    await started; f.advance();
    const next = { installationId: "9a167970-8905-4ada-a3a2-208ec668d53d", accountId: "account-2", bindingGeneration: 2, revocationToken: "disable-only-capability-2" };
    await writeBinding(next, f.storage); const before = jest.mocked(revokeNotificationInstallation).mock.calls.length;
    resume("granted" as never);
    await expect(pending).rejects.toThrow("บัญชีเปลี่ยนแล้ว");
    expect(await readBinding(f.storage)).toEqual(next);
    expect(jest.mocked(revokeNotificationInstallation).mock.calls.length).toBe(before);
  });
  it("reconciles a lost server binding with unchanged Expo token without prompting again", async () => {
    const f = fixture(); const service = createNotificationService(f); await service.enable(session);
    f.requestPermission.mockClear(); f.bind.mockClear();
    // Existing secure local consent remains, but remote ownership was disabled/lost.
    await service.refresh(session);
    expect(f.bind).toHaveBeenCalledTimes(1); expect(f.requestPermission).not.toHaveBeenCalled();
    expect((await readBinding(f.storage))?.accountId).toBe("account-1");
  });
  it("rotates only the provider token while preserving the installation identity and consent", async () => {
    const f = fixture(); await createNotificationService(f).enable(session); const before = await readBinding(f.storage);
    f.getStatus.mockResolvedValue({ available: true, enabled: true, bindingGeneration: 1 as never }); f.bind.mockClear(); f.requestPermission.mockClear();
    await createNotificationService({ ...f, token: async () => "ExponentPushToken[rotated-token]" }).refresh(session);
    expect(f.bind).toHaveBeenCalledWith({ installationId: before!.installationId, platform: "android", expoPushToken: "ExponentPushToken[rotated-token]" }, session.sessionToken);
    expect((await readBinding(f.storage))?.installationId).toBe(before!.installationId); expect(f.requestPermission).not.toHaveBeenCalled();
  });
});
