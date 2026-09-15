import {
  completeReviewerSandboxSignIn,
  getReviewerSandboxAvailability,
  updateReviewerWalletFixture,
} from "@/auth/reviewerSandbox";
import { mobileGet, mobilePost, mobilePostWithAuth } from "@/api/client";
import { saveMobileSession } from "@/auth/sessionStorage";

jest.mock("@/api/client", () => ({
  mobileGet: jest.fn(),
  mobilePost: jest.fn(),
  mobilePostWithAuth: jest.fn(),
}));
jest.mock("@/auth/sessionStorage", () => ({ saveMobileSession: jest.fn() }));

const reviewerSession = {
  sessionToken: "reviewer-session",
  expiresAt: 4_000_000_000,
  identity: {
    sessionVersion: 2 as const,
    accountId: "reviewer-account",
    providerUserId: "reviewer-user",
    provider: "reviewer" as const,
  },
};

describe("reviewer sandbox API", () => {
  it("reads only the public availability flag", async () => {
    (mobileGet as jest.Mock).mockResolvedValue({ available: true });

    await expect(getReviewerSandboxAvailability()).resolves.toEqual({ available: true });
    expect(mobileGet).toHaveBeenCalledWith("/api/mobile/v2/auth/reviewer-availability");
  });

  it("submits reviewer credentials only to the reviewer session endpoint and stores its session", async () => {
    (mobilePost as jest.Mock).mockResolvedValue(reviewerSession);

    await expect(
      completeReviewerSandboxSignIn({ username: " reviewer ", password: "not-a-real-secret" })
    ).resolves.toEqual(reviewerSession);

    expect(mobilePost).toHaveBeenCalledWith("/api/mobile/v2/auth/reviewer-session", {
      username: "reviewer",
      password: "not-a-real-secret",
    });
    expect(saveMobileSession).toHaveBeenCalledWith(reviewerSession);
  });

  it("updates only the non-financial reviewer fixture with the reviewer bearer token", async () => {
    (mobilePostWithAuth as jest.Mock).mockResolvedValue({
      kind: "reviewer-sandbox",
      label: "Demo wallet fixture",
      linked: true,
      walletAddress: null,
    });

    await expect(updateReviewerWalletFixture("reviewer-session", true)).resolves.toMatchObject({
      linked: true,
      walletAddress: null,
    });
    expect(mobilePostWithAuth).toHaveBeenCalledWith(
      "/api/mobile/v2/reviewer/wallet-fixture",
      { linked: true },
      "reviewer-session"
    );
  });
});
