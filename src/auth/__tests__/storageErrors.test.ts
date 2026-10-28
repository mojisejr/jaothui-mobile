import { clearMobileSession, loadMobileSession, saveMobileSession, MobileSessionStorageError } from "../sessionStorage";
import { eraseOAuthIntent, readOAuthIntent, writeOAuthIntent, OAUTH_INTENT_KEY, type OAuthIntent } from "../oauthIntentStorage";
import { SECURE_STORAGE_ERROR_MESSAGE } from "../storageErrors";
import type { MobileAppleAccountSession } from "@/types/mobile-api";
const SESSION_KEY = "jaothui.mobileSession.v1";
const session: MobileAppleAccountSession = { sessionToken: "existing-session", expiresAt: 4e9, identity: { sessionVersion: 2, provider: "apple", accountId: "account-a", providerUserId: "apple-a", appleUserId: "apple-a", email: null, displayName: null, avatarUrl: null, linkedWallet: null } };
const now = Date.now();
const intent: OAuthIntent = { flowId: "bounded-flow-123456", kind: "link", eventId: "event-a", expectedIdentity: "account:account-a", createdAt: now, expiresAt: now + 600000, status: "pending" };
function adapter(rawSession = JSON.stringify(session)) {
  const values: Record<string, string> = { [SESSION_KEY]: rawSession, [OAUTH_INTENT_KEY]: JSON.stringify(intent) };
  return { values, getItemAsync: jest.fn(async (key: string) => values[key] ?? null), setItemAsync: jest.fn(async (key: string, value: string) => { values[key] = value; }), deleteItemAsync: jest.fn(async (key: string) => { delete values[key]; }), isAvailableAsync: jest.fn(async () => true) };
}
async function expectStorageFailure(operation: Promise<unknown>, cause: Error) {
  await expect(operation).rejects.toMatchObject({ name: "MobileSessionStorageError", message: SECURE_STORAGE_ERROR_MESSAGE, cause });
  await expect(operation).rejects.toBeInstanceOf(MobileSessionStorageError);
}
describe("native SecureStore failures remain typed failures without destructive recovery", () => {
  it("does not return guest or erase session/intent when native read fails", async () => {
    const storage = adapter(), before = { ...storage.values }, cause = new Error("A required entitlement isn't present"); storage.getItemAsync.mockRejectedValueOnce(cause);
    await expectStorageFailure(loadMobileSession(storage), cause);
    expect(storage.values).toEqual(before); expect(storage.setItemAsync).not.toHaveBeenCalled(); expect(storage.deleteItemAsync).not.toHaveBeenCalled();
  });
  it("wraps availability exceptions and false availability without reading or clearing keys", async () => {
    const storage = adapter(), cause = new Error("native bridge unavailable"); storage.isAvailableAsync.mockRejectedValueOnce(cause);
    await expectStorageFailure(loadMobileSession(storage), cause);
    storage.isAvailableAsync.mockResolvedValue(false); await expect(loadMobileSession(storage)).rejects.toMatchObject({ name: "MobileSessionStorageError", message: SECURE_STORAGE_ERROR_MESSAGE });
    expect(storage.getItemAsync).not.toHaveBeenCalled(); expect(storage.deleteItemAsync).not.toHaveBeenCalled();
  });
  it("does not erase a recoverable intent or replace the old session when a session write fails", async () => {
    const storage = adapter(), before = { ...storage.values }, cause = new Error("native write failed"); storage.setItemAsync.mockRejectedValueOnce(cause);
    await expectStorageFailure(saveMobileSession({ ...session, sessionToken: "replacement" }, storage), cause);
    expect(storage.values).toEqual(before); expect(storage.deleteItemAsync).not.toHaveBeenCalled();
  });
  it("does not retry a native delete failure from invalid-JSON cleanup or wipe intent", async () => {
    const storage = adapter("{bad json"), before = { ...storage.values }, cause = new Error("delete failed"); storage.deleteItemAsync.mockRejectedValue(cause);
    await expectStorageFailure(loadMobileSession(storage), cause);
    expect(storage.deleteItemAsync).toHaveBeenCalledTimes(1); expect(storage.deleteItemAsync).toHaveBeenCalledWith(SESSION_KEY); expect(storage.values).toEqual(before);
  });
  it("stops explicit logout after its failed session delete instead of erasing intent", async () => {
    const storage = adapter(), before = { ...storage.values }, cause = new Error("delete failed"); storage.deleteItemAsync.mockRejectedValueOnce(cause);
    await expectStorageFailure(clearMobileSession(storage), cause);
    expect(storage.values).toEqual(before); expect(storage.getItemAsync).not.toHaveBeenCalled(); expect(storage.deleteItemAsync).toHaveBeenCalledTimes(1);
  });
  it.each(["read", "write", "erase"])("wraps intent %s SDK failure while preserving the stored keys", async operation => {
    const storage = adapter(), before = { ...storage.values }, cause = new Error("native intent operation failed");
    if (operation === "read") storage.getItemAsync.mockRejectedValueOnce(cause);
    if (operation === "write") storage.setItemAsync.mockRejectedValueOnce(cause);
    if (operation === "erase") storage.deleteItemAsync.mockRejectedValueOnce(cause);
    const result = operation === "read" ? readOAuthIntent(storage) : operation === "write" ? writeOAuthIntent({ ...intent, eventId: "event-b" }, storage) : eraseOAuthIntent(storage);
    await expectStorageFailure(result, cause); expect(storage.values).toEqual(before);
    expect(storage.deleteItemAsync).toHaveBeenCalledTimes(operation === "erase" ? 1 : 0);
  });
  it("reports partial two-key cleanup failure without rolling back a saved session or retrying erase", async () => {
    const storage = adapter(), cause = new Error("intent delete failed"); storage.deleteItemAsync.mockRejectedValueOnce(cause);
    await expectStorageFailure(saveMobileSession({ ...session, sessionToken: "saved-session" }, storage), cause);
    expect(JSON.parse(storage.values[SESSION_KEY]).sessionToken).toBe("saved-session"); expect(storage.values[OAUTH_INTENT_KEY]).toBe(JSON.stringify(intent)); expect(storage.setItemAsync).toHaveBeenCalledTimes(1); expect(storage.deleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
