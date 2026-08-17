import { MobileApiError } from "@/api/client";
import { recoverRejectedMobileSession } from "@/features/profile/sessionRecovery";

describe("recoverRejectedMobileSession", () => {
  it("clears the saved session when the profile API rejects it with 401", async () => {
    const clearSession = jest.fn(async () => undefined);

    await expect(
      recoverRejectedMobileSession(
        new MobileApiError("Invalid or expired session", "UNAUTHORIZED", 401),
        clearSession
      )
    ).resolves.toBe(true);

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the saved session for non-401 profile failures so the user can retry", async () => {
    const clearSession = jest.fn(async () => undefined);

    await expect(
      recoverRejectedMobileSession(new MobileApiError("Unable to load profile", "INTERNAL", 500), clearSession)
    ).resolves.toBe(false);

    expect(clearSession).not.toHaveBeenCalled();
  });

  it("returns to sign-in even if SecureStore cannot be cleared", async () => {
    const clearSession = jest.fn(async () => {
      throw new Error("SecureStore unavailable");
    });

    await expect(
      recoverRejectedMobileSession(
        new MobileApiError("Invalid or expired session", "UNAUTHORIZED", 401),
        clearSession
      )
    ).resolves.toBe(true);
  });
});
