import { createOAuthCompletion } from "../oauthCompletion";
import { clearMobileSession, loadMobileSession, saveMobileSession } from "../sessionStorage";
import { OAUTH_INTENT_KEY, readOAuthIntent, OAUTH_INTENT_TTL_MS } from "../oauthIntentStorage";
import { MobileApiError } from "@/api/client";
import type { MobileAppleAccountSession, MobileLineAccountSession } from "@/types/mobile-api";
import { recoverRejectedMobileSession } from "@/features/profile/sessionRecovery";

const line: MobileLineAccountSession = { sessionToken: "line", expiresAt: 4e9, identity: { sessionVersion: 2, accountId: "line-account", providerUserId: "line-sub", lineUserId: "line-sub", provider: "line", linkedWallet: null, email: null, displayName: null, avatarUrl: null } };
const apple: MobileAppleAccountSession = { sessionToken: "apple", expiresAt: 4e9, identity: { sessionVersion: 2, accountId: "apple-account", providerUserId: "apple-sub", appleUserId: "apple-sub", provider: "apple", linkedWallet: { provider: "bitkub-next", walletAddress: "0xoriginal", email: null }, email: null, displayName: null, avatarUrl: null } };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { resolve, promise }; };
function harness() {
  const values: Record<string, string> = {};
  const storage = { getItemAsync: jest.fn(async (key: string) => values[key] ?? null), setItemAsync: jest.fn(async (key: string, value: string) => { values[key] = value; }), deleteItemAsync: jest.fn(async (key: string) => { delete values[key]; }) };
  let now = Date.now();
  const deps = { storage, loadSession: () => loadMobileSession(storage), saveSession: (session: Parameters<typeof saveMobileSession>[0], guard: NonNullable<Parameters<typeof saveMobileSession>[2]>) => saveMobileSession(session, storage, guard), redeemLogin: jest.fn(async (_handoff: string, clientFlowId: string) => ({ ...line, clientFlowId })), redeemLink: jest.fn(async () => ({ ...apple, sessionToken: "linked", returnIntent: { kind: "event-apply" as const, eventId: "event-a" }, replayed: false })), cancelLink: jest.fn(async () => ({})), now: () => now };
  return { values, storage, deps, coordinator: createOAuthCompletion(deps), expire: () => { now += OAUTH_INTENT_TTL_MS + 1; } };
}
function callback(flowId?: string, extra = "handoff=opaque") { return `jaothui://oauth/callback?provider=line${flowId ? `&clientFlowId=${flowId}` : ""}&${extra}`; }
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }

describe("persisted event OAuth coordinator", () => {
  it("deduplicates both warm callback paths, cold recovery and returns the same event without submitting", async () => {
    const h = harness(), { intent } = await h.coordinator.begin("login", "event-a"), url = callback(intent.flowId);
    const wait = deferred<MobileLineAccountSession & { clientFlowId: string }>(); h.deps.redeemLogin.mockReturnValue(wait.promise);
    const a = h.coordinator.complete(url), b = h.coordinator.complete(url); await settle();
    wait.resolve({ ...line, clientFlowId: intent.flowId });
    expect((await a).target).toBe("/events/event-a"); expect((await b).target).toBe("/events/event-a");
    expect(h.deps.redeemLogin).toHaveBeenCalledTimes(1);
    expect((await createOAuthCompletion(h.deps).complete(url)).target).toBe("/events/event-a");
    expect(h.deps.redeemLogin).toHaveBeenCalledTimes(1);
  });
  it("supports cold pending intent and Profile login without an event intent", async () => {
    const h = harness(), { intent } = await h.coordinator.begin("login");
    expect((await createOAuthCompletion(h.deps).complete(callback(intent.flowId))).target).toBe("/profile");
  });
  it("requires the current verified correlation in URL AND redeemed response", async () => {
    const h = harness(), old = await h.coordinator.begin("login", "event-a"), current = await h.coordinator.begin("login", "event-b");
    for (const url of [callback(old.intent.flowId), callback(undefined), callback(old.intent.flowId, "error=access_denied")]) await expect(h.coordinator.complete(url)).rejects.toThrow();
    expect(await h.coordinator.exit(callback(old.intent.flowId, "error=access_denied"))).toBe("/profile");
    expect((await readOAuthIntent(h.storage))?.flowId).toBe(current.intent.flowId); expect(h.deps.redeemLogin).not.toHaveBeenCalled();
    h.deps.redeemLogin.mockResolvedValue({ ...line, clientFlowId: old.intent.flowId });
    await expect(h.coordinator.complete(callback(current.intent.flowId))).rejects.toThrow(); expect(await loadMobileSession(h.storage)).toBeNull();
  });
  it("rejects late success after logout or a new Account login", async () => {
    for (const accountSwitch of [false, true]) {
      const h = harness(), { intent } = await h.coordinator.begin("login", "event-a");
      const wait = deferred<MobileLineAccountSession & { clientFlowId: string }>(); h.deps.redeemLogin.mockReturnValue(wait.promise);
      const completion = h.coordinator.complete(callback(intent.flowId)); await settle();
      if (accountSwitch) await saveMobileSession(apple, h.storage); else await clearMobileSession(h.storage);
      wait.resolve({ ...line, clientFlowId: intent.flowId }); await expect(completion).rejects.toThrow();
      expect(await loadMobileSession(h.storage)).toEqual(accountSwitch ? apple : null);
    }
  });
  it("cancels only the matching flow and expires a cold intent", async () => {
    const h = harness(), { intent } = await h.coordinator.begin("login", "event-a");
    await expect(h.coordinator.complete(callback(intent.flowId, "error=access_denied"))).rejects.toThrow();
    expect(await h.coordinator.exit(callback(intent.flowId, "error=access_denied"))).toBe("/events/event-a");
    expect(h.values[OAUTH_INTENT_KEY]).toBeUndefined();
    const next = await h.coordinator.begin("login", "event-b"); h.expire();
    await expect(createOAuthCompletion(h.deps).complete(callback(next.intent.flowId))).rejects.toThrow();
  });
  it("preserves session and intent on503; allows deliberate exact retry", async () => {
    const h = harness(); await saveMobileSession(apple, h.storage);
    const { intent, generation } = await h.coordinator.begin("link", "event-a"); const serverId = "a".repeat(64);
    await h.coordinator.bindServerIntent(intent, serverId, generation);
    const url = callback(undefined, `purpose=link&intentId=${serverId}&handoff=opaque`);
    h.deps.redeemLink.mockRejectedValueOnce(new MobileApiError("temporary", "AUTH_UNAVAILABLE", 503));
    await expect(h.coordinator.complete(url)).rejects.toThrow("temporary");
    expect(await loadMobileSession(h.storage)).toEqual(apple); expect((await readOAuthIntent(h.storage))?.flowId).toBe(intent.flowId);
    expect((await h.coordinator.complete(url)).session.identity).toEqual(apple.identity);
  });
  it("binds link purpose/event/account; stale link errors cannot cancel newer flow", async () => {
    const h = harness(); await saveMobileSession(apple, h.storage);
    const { intent, generation } = await h.coordinator.begin("link", "event-a"); await h.coordinator.bindServerIntent(intent, "b".repeat(64), generation);
    await expect(h.coordinator.complete(callback(undefined, `purpose=link&intentId=${"c".repeat(64)}&error=cancelled`))).rejects.toThrow();
    await h.coordinator.exit(callback(undefined, `purpose=link&intentId=${"c".repeat(64)}&error=cancelled`));
    expect((await readOAuthIntent(h.storage))?.flowId).toBe(intent.flowId);
    h.deps.redeemLink.mockResolvedValueOnce({ ...apple, identity: { ...apple.identity, accountId: "other-account" }, returnIntent: { kind: "event-apply", eventId: "event-a" }, replayed: false });
    await expect(h.coordinator.complete(callback(undefined, `purpose=link&intentId=${"b".repeat(64)}&handoff=opaque`))).rejects.toThrow();
    expect(await loadMobileSession(h.storage)).toEqual(apple);
    const refreshed = { ...apple, identity: { ...apple.identity, linkedWallet: { provider: "bitkub-next" as const, walletAddress: "0xauthoritative", email: null } } };
    h.deps.redeemLink.mockResolvedValueOnce({ ...refreshed, returnIntent: { kind: "event-apply", eventId: "event-a" }, replayed: false });
    expect((await h.coordinator.complete(callback(undefined, `purpose=link&intentId=${"b".repeat(64)}&handoff=opaque`))).session.identity).toEqual(refreshed.identity);
  });
  it("recovers a session-write failure after persisted receipt", async () => {
    const h = harness(), { intent } = await h.coordinator.begin("login", "event-a");
    const set = h.storage.setItemAsync.getMockImplementation()!;
    h.storage.setItemAsync.mockImplementation(async (key, value) => { if (key === "jaothui.mobileSession.v1") throw new Error("disk full"); await set(key, value); });
    await expect(h.coordinator.complete(callback(intent.flowId))).rejects.toThrow("disk full");
    expect((await readOAuthIntent(h.storage))?.status).toBe("completed");
    h.storage.setItemAsync.mockImplementation(set);
    expect((await createOAuthCompletion(h.deps).complete(callback(intent.flowId))).target).toBe("/events/event-a");
  });
  it("separates true401 from service503 and intent409", async () => {
    const clear = jest.fn(async () => {});
    for (const status of [503, 409]) expect(await recoverRejectedMobileSession(new MobileApiError("x", "x", status), clear)).toBe(false);
    expect(clear).not.toHaveBeenCalled(); expect(await recoverRejectedMobileSession(new MobileApiError("x", "UNAUTHORIZED", 401), clear)).toBe(true); expect(clear).toHaveBeenCalledTimes(1);
  });
});
