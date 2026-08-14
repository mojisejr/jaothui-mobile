import { buildBuffaloQueryString, deleteAccount, getMe, getNewsEvents, getProfile } from "@/api/jaothui";
import { mobileDeleteWithAuth, mobileGet, mobileGetWithAuth } from "@/api/client";

jest.mock("@/api/client", () => ({
  mobileGet: jest.fn(),
  mobileDeleteWithAuth: jest.fn(),
  mobileGetWithAuth: jest.fn(),
}));

describe("buildBuffaloQueryString", () => {
  it("uses stable default list query params", () => {
    expect(buildBuffaloQueryString()).toBe("page=1&sortBy=latest");
  });

  it("omits all-filter values and trims search/age values", () => {
    expect(
      buildBuffaloQueryString({
        page: 2,
        search: " หมูตุ๋น ",
        sex: "all",
        color: "black",
        ageOperator: ">=",
        ageValue: " 18 ",
        sortBy: "youngest",
      })
    ).toBe(
      "page=2&sortBy=youngest&search=%E0%B8%AB%E0%B8%A1%E0%B8%B9%E0%B8%95%E0%B8%B8%E0%B9%8B%E0%B8%99&color=black&ageOperator=%3E%3D&ageValue=18"
    );
  });

  it("does not send age operator without an age value", () => {
    expect(buildBuffaloQueryString({ ageOperator: "<=", ageValue: " " })).toBe("page=1&sortBy=latest");
  });
});

describe("getNewsEvents", () => {
  it("calls the public mobile news events endpoint", async () => {
    (mobileGet as jest.Mock).mockResolvedValueOnce({ items: [] });

    await expect(getNewsEvents()).resolves.toEqual({ items: [] });

    expect(mobileGet).toHaveBeenCalledWith("/api/mobile/v1/news-events");
  });
});

describe("profile API", () => {
  it("uses v2 mobile account endpoints for authenticated profile calls", async () => {
    (mobileGetWithAuth as jest.Mock).mockResolvedValueOnce({ identity: null }).mockResolvedValueOnce({
      identity: null,
      member: null,
      ownedBuffalos: [],
      counts: { ownedBuffalos: 0 },
    });

    await getMe("session-token");
    await getProfile("session-token");

    expect(mobileGetWithAuth).toHaveBeenNthCalledWith(1, "/api/mobile/v2/me", "session-token");
    expect(mobileGetWithAuth).toHaveBeenNthCalledWith(2, "/api/mobile/v2/profile", "session-token");
  });

  it("uses the authenticated v2 deletion endpoint", async () => {
    (mobileDeleteWithAuth as jest.Mock).mockResolvedValueOnce({
      deletedAt: "2026-08-13T00:00:00.000Z",
      deletionPolicyVersion: "2026-08-13",
      manualAppleRevocationRequired: false,
    });

    await deleteAccount("session-token");

    expect(mobileDeleteWithAuth).toHaveBeenCalledWith("/api/mobile/v2/account", "session-token");
  });
});
