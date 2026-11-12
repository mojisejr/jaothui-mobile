import { dismissInvitation, invitationDismissed, INVITATION_DISMISSAL_KEY, INVITATION_DISMISSAL_MS } from "../invitationDismissal";
import type { SecureStoreAdapter } from "@/auth/sessionStorage";
const fixture = () => {
  const values = new Map<string, string>();
  const storage: SecureStoreAdapter = { getItemAsync: async key => values.get(key) ?? null, setItemAsync: async (key, value) => { values.set(key, value); }, deleteItemAsync: async key => { values.delete(key); } };
  return { storage, values };
};
describe("per-device account invitation dismissal", () => {
  it("shares the same seven-day dismissal across placements without suppressing another account", async () => {
    const f = fixture(), now = 100000000;
    await dismissInvitation("account-1", () => undefined, f.storage, now);
    expect(await invitationDismissed("account-1", f.storage, now + 1)).toBe(true);
    expect(await invitationDismissed("account-2", f.storage, now + 1)).toBe(false);
    expect(await invitationDismissed("account-1", f.storage, now + INVITATION_DISMISSAL_MS)).toBe(false);
  });
  it("bounds the stored map, prunes expiry and keeps a repeat dismissal unique", async () => {
    const f = fixture(), now = 100000000;
    for (let i = 0; i < 12; i++) await dismissInvitation(`account-${i}`, () => undefined, f.storage, now);
    await dismissInvitation("account-11", () => undefined, f.storage, now + 100);
    const stored = JSON.parse(f.values.get(INVITATION_DISMISSAL_KEY)!);
    expect(stored).toHaveLength(8); expect(stored.filter((item: { accountId: string }) => item.accountId === "account-11")).toHaveLength(1);
    await dismissInvitation("next-account", () => undefined, f.storage, now + INVITATION_DISMISSAL_MS + 100);
    expect(JSON.parse(f.values.get(INVITATION_DISMISSAL_KEY)!)).toHaveLength(1);
  });
  it("rejects stale account writes and does not treat malformed/overlong records as a permanent dismissal", async () => {
    const f = fixture();
    await expect(dismissInvitation("account-1", () => { throw new Error("account switched"); }, f.storage)).rejects.toThrow("account switched");
    expect(f.values.has(INVITATION_DISMISSAL_KEY)).toBe(false);
    f.values.set(INVITATION_DISMISSAL_KEY, "invalid json"); expect(await invitationDismissed("account-1", f.storage)).toBe(false);
    f.values.set(INVITATION_DISMISSAL_KEY, JSON.stringify([{ accountId: "account-1", until: Date.now() + INVITATION_DISMISSAL_MS * 2 }]));
    expect(await invitationDismissed("account-1", f.storage)).toBe(false);
  });
});
