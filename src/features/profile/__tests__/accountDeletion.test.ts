import { deleteAccountThenClearSession } from "@/features/profile/accountDeletion";

const receipt = {
  deletedAt: "2026-08-13T00:00:00.000Z",
  deletionPolicyVersion: "2026-08-13",
  manualAppleRevocationRequired: false,
};

describe("deleteAccountThenClearSession", () => {
  it("clears the local session only after a successful server deletion receipt", async () => {
    const deleteAccount = jest.fn(async () => receipt);
    const clearSession = jest.fn(async () => undefined);

    await expect(
      deleteAccountThenClearSession("session-token", { deleteAccount, clearSession })
    ).resolves.toEqual({ localSessionCleared: true, receipt });

    expect(deleteAccount).toHaveBeenCalledWith("session-token");
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(deleteAccount.mock.invocationCallOrder[0]).toBeLessThan(clearSession.mock.invocationCallOrder[0]);
  });

  it("keeps the local session when the server rejects deletion", async () => {
    const deleteAccount = jest.fn(async () => {
      throw new Error("Unable to delete account");
    });
    const clearSession = jest.fn(async () => undefined);

    await expect(
      deleteAccountThenClearSession("session-token", { deleteAccount, clearSession })
    ).rejects.toThrow("Unable to delete account");

    expect(clearSession).not.toHaveBeenCalled();
  });

  it("preserves the successful receipt when SecureStore clearing fails", async () => {
    const deleteAccount = jest.fn(async () => receipt);
    const clearSession = jest.fn(async () => {
      throw new Error("SecureStore unavailable");
    });

    await expect(
      deleteAccountThenClearSession("session-token", { deleteAccount, clearSession })
    ).resolves.toEqual({ localSessionCleared: false, receipt });

    expect(clearSession).toHaveBeenCalledTimes(1);
  });
});
