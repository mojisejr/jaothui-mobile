import { consumeHistoryIntent, HISTORY_INTENT_KEY, HISTORY_INTENT_TTL_MS, parseReminderData, readHistoryIntent, rememberHistoryIntent } from "../historyIntent";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
const fixture = () => {
  const values = new Map<string, string>();
  const storage: SecureStoreAdapter = { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value); }, deleteItemAsync: async key => { values.delete(key); } };
  return { storage, values };
};
describe("notification owned-history intent", () => {
  it("only decodes the fixed reminder kind, stable published event ID and allowlisted data", () => {
    expect(parseReminderData({ kind: "competition-reminder", eventId: "competition-event-1", reminderId: "job-1", expiresAt: "2026-11-22T17:00:00Z" })).toEqual({ eventId: "competition-event-1" });
    for (const input of [null, { kind: "url", eventId: "event-1" }, { kind: "competition-reminder", eventId: "drafts.event" }, { kind: "competition-reminder", eventId: "../profile" }, { kind: "competition-reminder", eventId: "event-1", url: "https://evil.test" }, { kind: "competition-reminder", eventId: "event-1", expiresAt: "yesterday" }]) expect(parseReminderData(input)).toBeNull();
  });
  it("persists a bounded target across expired login and consumes it exactly once for the same account", async () => {
    const f = fixture();
    await rememberHistoryIntent("event-1", "account-1", f.storage);
    expect(await consumeHistoryIntent("account-1", f.storage)).toBe("/registrations?eventId=event-1");
    expect(await consumeHistoryIntent("account-1", f.storage)).toBeNull();
  });
  it("never restores a previous account target after switching accounts", async () => {
    const f = fixture(); await rememberHistoryIntent("event-1", "account-1", f.storage);
    expect(await consumeHistoryIntent("account-2", f.storage)).toBeNull();
    expect(f.values.has(HISTORY_INTENT_KEY)).toBe(false);
  });
  it("expires old, future and overlong persisted intents without navigation", async () => {
    const f = fixture(); const now = 100000000;
    for (const value of [{ createdAt: now - HISTORY_INTENT_TTL_MS, expiresAt: now }, { createdAt: now + 1, expiresAt: now + 1000 }, { createdAt: now - 1, expiresAt: now + HISTORY_INTENT_TTL_MS + 1 }]) {
      f.values.set(HISTORY_INTENT_KEY, JSON.stringify({ eventId: "event-1", accountId: null, ...value }));
      expect(await readHistoryIntent(f.storage, now)).toBeNull();
    }
  });
});
