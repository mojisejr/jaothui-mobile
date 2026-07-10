import { API_BASE_URL, mobileGet, mobileGetWithAuth, mobilePost } from "@/api/client";

function mockJsonResponse(payload: unknown, status = 200) {
  return {
    status,
    json: jest.fn(async () => payload),
  } as unknown as Response;
}

function mockUnreadableResponse(status = 304) {
  return {
    status,
    json: jest.fn(async () => {
      throw new Error("empty body");
    }),
  } as unknown as Response;
}

describe("mobile API client", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps public GET requests unauthenticated", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ ok: true, data: { ok: true } }));

    await expect(mobileGet<{ ok: boolean }>("/api/mobile/v1/home")).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api/mobile/v1/home`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: undefined,
    });
  });

  it("attaches Authorization only when a bearer token is present", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ ok: true, data: { walletAddress: "0x123" } }));

    await mobileGetWithAuth("/api/mobile/v1/me", "session-token");
    await mobileGetWithAuth("/api/mobile/v1/me", null);

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${API_BASE_URL}/api/mobile/v1/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer session-token",
        "Cache-Control": "no-cache",
      },
      body: undefined,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_BASE_URL}/api/mobile/v1/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      body: undefined,
    });
  });

  it("posts JSON body for handoff redemption", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse({
        ok: true,
        data: { sessionToken: "session-token" },
      })
    );

    await mobilePost("/api/mobile/v1/auth/bitkub-next/session", { handoff: "handoff-token" });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/mobile/v1/auth/bitkub-next/session`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handoff: "handoff-token" }),
      }
    );
  });

  it("throws a readable API error for empty cached responses", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(mockUnreadableResponse(304));

    await expect(mobileGet("/api/mobile/v1/profile")).rejects.toMatchObject({
      code: "UNREADABLE_RESPONSE",
      status: 304,
    });
  });
});
