import {
  completeAppleAccountCredential,
  isAppleAccountAuthAvailable,
  redeemAppleIdentityToken,
} from "@/auth/appleAccount";
import { mobilePostWithAuth } from "@/api/client";
import { loadMobileSession, saveMobileSession } from "@/auth/sessionStorage";
import type { MobileAppleAccountSession } from "@/types/mobile-api";

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(async () => true),
  AppleAuthenticationScope: {
    FULL_NAME: "FULL_NAME",
    EMAIL: "EMAIL",
  },
  signInAsync: jest.fn(),
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
  },
}));

jest.mock("@/api/client", () => ({
  mobilePostWithAuth: jest.fn(),
}));

jest.mock("@/auth/sessionStorage", () => ({
  loadMobileSession: jest.fn(),
  saveMobileSession: jest.fn(),
}));

const appleSession: MobileAppleAccountSession = {
  sessionToken: "apple-session-token",
  expiresAt: 4_000_000_000,
  identity: {
    sessionVersion: 2,
    accountId: "account_apple",
    providerUserId: "apple-sub-1",
    appleUserId: "apple-sub-1",
    provider: "apple",
    email: "apple@example.com",
    displayName: "Apple Holder",
    avatarUrl: null,
    linkedWallet: null,
  },
};

describe("Apple account auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mobilePostWithAuth as jest.Mock).mockResolvedValue(appleSession);
    (loadMobileSession as jest.Mock).mockResolvedValue(null);
  });

  it("detects native Apple auth availability on iOS", async () => {
    await expect(isAppleAccountAuthAvailable()).resolves.toBe(true);
  });

  it("redeems an Apple identity token with metadata only", async () => {
    await expect(
      redeemAppleIdentityToken({
        identityToken: "identity-token",
        email: "apple@example.com",
        displayName: "Apple Holder",
      })
    ).resolves.toEqual(appleSession);

    expect(mobilePostWithAuth).toHaveBeenCalledWith(
      "/api/mobile/v2/auth/apple/session",
      {
        identityToken: "identity-token",
        email: "apple@example.com",
        displayName: "Apple Holder",
      },
      null
    );
  });

  it("uses the current JAOTHUI account session only when attaching Apple", async () => {
    (loadMobileSession as jest.Mock).mockResolvedValue(appleSession);

    await expect(
      redeemAppleIdentityToken({
        identityToken: "identity-token",
        attachToCurrentAccount: true,
      })
    ).resolves.toEqual(appleSession);

    expect(mobilePostWithAuth).toHaveBeenCalledWith(
      "/api/mobile/v2/auth/apple/session",
      {
        identityToken: "identity-token",
        email: null,
        displayName: null,
      },
      "apple-session-token"
    );
  });

  it("saves a session after completing an Apple credential", async () => {
    await expect(
      completeAppleAccountCredential({
        user: "apple-sub-1",
        identityToken: "identity-token",
        email: "apple@example.com",
        fullName: {
          givenName: "Apple",
          middleName: null,
          familyName: "Holder",
          namePrefix: null,
          nameSuffix: null,
          nickname: null,
        },
        authorizationCode: null,
        realUserStatus: 1,
        state: null,
      })
    ).resolves.toMatchObject({ ok: true, session: appleSession });

    expect(saveMobileSession).toHaveBeenCalledWith(appleSession);
  });
});
