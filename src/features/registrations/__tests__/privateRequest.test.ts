import { eventPrivateRequest } from "../privateRequest";
import { loadMobileSession, clearMobileSession, MobileSessionStorageError } from "@/auth/sessionStorage";
import { MobileApiError } from "@/api/client";
import type { MobileAppleAccountSession } from "@/types/mobile-api";
jest.mock("@/auth/sessionStorage", () => ({ ...jest.requireActual("@/auth/sessionStorage"), loadMobileSession: jest.fn(), clearMobileSession: jest.fn() }));
const session: MobileAppleAccountSession = { sessionToken: "apple-account", expiresAt: 4e9, identity: { sessionVersion: 2, accountId: "account", providerUserId: "apple-sub", appleUserId: "apple-sub", provider: "apple", linkedWallet: null, email: null, displayName: null, avatarUrl: null } };
describe("private event resource boundary", () => {
  beforeEach(() => { jest.clearAllMocks(); (loadMobileSession as jest.Mock).mockResolvedValue(session); });
  it("fails closed for guest/reviewer/wallet/unavailablestorage before private fetch", async () => {
    const read = jest.fn();
    for (const identity of [null, { ...session, identity: { sessionVersion: 2, provider: "reviewer", accountId: "reviewer" } }, { sessionToken: "wallet", identity: { provider: "bitkub-next", walletAddress: "0x" } }]) { (loadMobileSession as jest.Mock).mockResolvedValue(identity); await expect(eventPrivateRequest(read)).rejects.toThrow(); }
    (loadMobileSession as jest.Mock).mockRejectedValue(new MobileSessionStorageError("unavailable")); await expect(eventPrivateRequest(read)).rejects.toThrow("unavailable"); expect(read).not.toHaveBeenCalled();
  });
  it("keeps deleted/foreign404 indistinguishable and503/409 preserveaccount", async () => {
    for (const status of [404, 503, 409]) await expect(eventPrivateRequest(async () => { throw new MobileApiError("unavailable", "REGISTRATION_NOT_FOUND", status); })).rejects.toMatchObject({ status });
    expect(clearMobileSession).not.toHaveBeenCalled();
    await expect(eventPrivateRequest(async () => { throw new MobileApiError("expired", "INVALID_SESSION", 401); })).rejects.toMatchObject({ status: 401 }); expect(clearMobileSession).toHaveBeenCalledTimes(1);
  });
  it("rejects oldaccount data without clearing a newer account on a stale401", async () => {
    (loadMobileSession as jest.Mock).mockResolvedValueOnce(session).mockResolvedValue({ ...session, sessionToken: "new-token", identity: { ...session.identity, accountId: "other" } });
    await expect(eventPrivateRequest(async () => "old-secret")).rejects.toThrow("บัญชีเปลี่ยน"); expect(clearMobileSession).not.toHaveBeenCalled();
  });
});
