import { flushNotificationRevocations, revokeCurrentNotificationBinding } from "../lifecycle";
import { BINDING_KEY, installationId, readBinding, readRevocations, writeBinding } from "../storage";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
import { loadMobileSession, logoutMobileSession } from "@/auth/sessionStorage";
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "9a167970-8905-4ada-a3a2-208ec668d53d") }));
jest.mock("../api", () => ({ revokeNotificationInstallation: jest.fn(async () => { throw new Error("offline"); }) }));
const fixture = () => {
  const values = new Map<string, string>();
  const storage: SecureStoreAdapter = { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value); }, deleteItemAsync: async key => { values.delete(key); } };
  return { storage, values };
};
const binding = { installationId: "9a167970-8905-4ada-a3a2-208ec668d53d", accountId: "account-1", bindingGeneration: 1, revocationToken: "disable-only-capability-generation-1" };
describe("installation ownership lifecycle", () => {
  it("creates one stable UUID even when concurrent initial reads race", async () => {
    const f = fixture(); const ids = await Promise.all([installationId(f.storage), installationId(f.storage)]);
    expect(ids[0]).toBe(ids[1]); expect(await installationId(f.storage)).toBe(ids[0]);
  });
  it("offline logout keeps only a disable capability and retries without account credentials", async () => {
    const f = fixture(); await writeBinding(binding, f.storage);
    expect(await revokeCurrentNotificationBinding(f.storage, async () => { throw new Error("offline"); })).toBe(false);
    expect(await readBinding(f.storage)).toBeNull();
    expect(await readRevocations(f.storage)).toEqual([{ installationId: binding.installationId, revocationToken: binding.revocationToken }]);
    expect([...f.values.values()].join("")).not.toContain("account-1");
    const revoke = jest.fn(async () => ({ enabled: false }));
    expect(await flushNotificationRevocations(f.storage, revoke)).toBe(true);
    expect(revoke).toHaveBeenCalledWith({ installationId: binding.installationId, revocationToken: binding.revocationToken });
    expect(await readRevocations(f.storage)).toEqual([]);
  });
  it("flushing an old generation does not remove a newly bound local account", async () => {
    const f = fixture(); await writeBinding(binding, f.storage);
    await revokeCurrentNotificationBinding(f.storage, async () => { throw new Error("offline"); });
    const next = { ...binding, accountId: "account-2", bindingGeneration: 2, revocationToken: "disable-only-capability-generation-2" };
    await writeBinding(next, f.storage);
    await flushNotificationRevocations(f.storage, async () => ({ enabled: false }));
    expect(await readBinding(f.storage)).toEqual(next); expect(f.values.has(BINDING_KEY)).toBe(true);
  });
  it("ordinary session expiry preserves consent while explicit logout queues revocation and clears credentials", async () => {
    const f = fixture(); await writeBinding(binding, f.storage);
    f.values.set("jaothui.mobileSession.v1", JSON.stringify({ sessionToken: "expired-account-session", expiresAt: 1, identity: { provider: "line", sessionVersion: 2, accountId: "account-1", providerUserId: "line-user", lineUserId: "line-user", linkedWallet: null } }));
    expect(await loadMobileSession(f.storage)).toBeNull(); expect(await readBinding(f.storage)).toEqual(binding);
    await logoutMobileSession(f.storage);
    expect(await readBinding(f.storage)).toBeNull(); expect(await readRevocations(f.storage)).toHaveLength(1);
    expect([...f.values.values()].join("")).not.toContain("expired-account-session");
  });
});
