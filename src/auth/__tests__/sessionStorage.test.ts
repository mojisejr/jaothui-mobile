import {
  clearMobileSession,
  loadMobileSession,
  loadMobileSessionToken,
  saveMobileSession,
} from "@/auth/sessionStorage";
import type { MobileBitkubNextSession, MobileLineAccountSession } from "@/types/mobile-api";

function createStorage(initial: Record<string, string> = {}, available = true) {
  const values = { ...initial };
  return {
    values,
    getItemAsync: jest.fn(async (key: string) => values[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete values[key];
    }),
    isAvailableAsync: jest.fn(async () => available),
  };
}

const session: MobileBitkubNextSession = {
  sessionToken: "session-token",
  expiresAt: 4_000_000_000,
  identity: {
    walletAddress: "0x123",
    email: "non@example.com",
    provider: "bitkub-next",
  },
};

const lineSession: MobileLineAccountSession = {
  sessionToken: "line-session-token",
  expiresAt: 4_000_000_000,
  identity: {
    sessionVersion: 2,
    accountId: "account_1",
    lineUserId: "line-user-1",
    email: "line@example.com",
    displayName: "LINE Holder",
    avatarUrl: "https://example.com/avatar.png",
    provider: "line",
    linkedWallet: null,
  },
};

describe("mobile session storage", () => {
  it("saves and loads a valid session", async () => {
    const storage = createStorage();

    await saveMobileSession(session, storage);

    await expect(loadMobileSession(storage, 3_000_000_000_000)).resolves.toEqual(session);
    await expect(loadMobileSessionToken(storage)).resolves.toBe("session-token");
  });

  it("saves and loads a valid LINE account session", async () => {
    const storage = createStorage();

    await saveMobileSession(lineSession, storage);

    await expect(loadMobileSession(storage, 3_000_000_000_000)).resolves.toEqual(lineSession);
  });

  it("compares API seconds-based expiry against device milliseconds", async () => {
    const storage = createStorage({
      "jaothui.mobileSession.v1": JSON.stringify({
        ...session,
        expiresAt: 1_800_000_000,
      }),
    });

    await expect(loadMobileSession(storage, 1_700_000_000_000)).resolves.toMatchObject({
      sessionToken: "session-token",
    });
    expect(storage.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("clears expired or invalid sessions", async () => {
    const expiredSession = { ...session, expiresAt: 4_000 };
    const expiredStorage = createStorage({
      "jaothui.mobileSession.v1": JSON.stringify(expiredSession),
    });
    await expect(loadMobileSession(expiredStorage, 5_000_000)).resolves.toBeNull();
    expect(expiredStorage.deleteItemAsync).toHaveBeenCalledWith("jaothui.mobileSession.v1");

    const invalidStorage = createStorage({ "jaothui.mobileSession.v1": "{bad json" });
    await expect(loadMobileSession(invalidStorage, 3_000_000)).resolves.toBeNull();
    expect(invalidStorage.deleteItemAsync).toHaveBeenCalledWith("jaothui.mobileSession.v1");

    const invalidLineStorage = createStorage({
      "jaothui.mobileSession.v1": JSON.stringify({
        ...lineSession,
        identity: {
          ...lineSession.identity,
          linkedWallet: { provider: "bitkub-next", walletAddress: "" },
        },
      }),
    });
    await expect(loadMobileSession(invalidLineStorage, 3_000_000)).resolves.toBeNull();
    expect(invalidLineStorage.deleteItemAsync).toHaveBeenCalledWith("jaothui.mobileSession.v1");
  });

  it("clears the stored session explicitly", async () => {
    const storage = createStorage({ "jaothui.mobileSession.v1": JSON.stringify(session) });

    await clearMobileSession(storage);

    expect(storage.values["jaothui.mobileSession.v1"]).toBeUndefined();
  });
});
