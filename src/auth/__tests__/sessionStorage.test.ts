import {
  clearMobileSession,
  loadMobileSession,
  loadMobileSessionToken,
  saveMobileSession,
} from "@/auth/sessionStorage";
import type { MobileBitkubNextSession } from "@/types/mobile-api";

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
  expiresAt: 4_000_000_000_000,
  identity: {
    walletAddress: "0x123",
    email: "non@example.com",
    provider: "bitkub-next",
  },
};

describe("mobile session storage", () => {
  it("saves and loads a valid session", async () => {
    const storage = createStorage();

    await saveMobileSession(session, storage);

    await expect(loadMobileSession(storage, 3_000)).resolves.toEqual(session);
    await expect(loadMobileSessionToken(storage)).resolves.toBe("session-token");
  });

  it("clears expired or invalid sessions", async () => {
    const expiredSession = { ...session, expiresAt: 4_000 };
    const expiredStorage = createStorage({
      "jaothui.mobileSession.v1": JSON.stringify(expiredSession),
    });
    await expect(loadMobileSession(expiredStorage, 5_000)).resolves.toBeNull();
    expect(expiredStorage.deleteItemAsync).toHaveBeenCalledWith("jaothui.mobileSession.v1");

    const invalidStorage = createStorage({ "jaothui.mobileSession.v1": "{bad json" });
    await expect(loadMobileSession(invalidStorage, 3_000)).resolves.toBeNull();
    expect(invalidStorage.deleteItemAsync).toHaveBeenCalledWith("jaothui.mobileSession.v1");
  });

  it("clears the stored session explicitly", async () => {
    const storage = createStorage({ "jaothui.mobileSession.v1": JSON.stringify(session) });

    await clearMobileSession(storage);

    expect(storage.values["jaothui.mobileSession.v1"]).toBeUndefined();
  });
});
