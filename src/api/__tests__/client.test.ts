import { API_BASE_URL, mobileGet, mobileGetWithAuth, mobilePost } from "@/api/client";

function mockJsonResponse(payload: unknown, status = 200) {
  return {
    status,
    json: jest.fn(async () => payload),
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
      headers: {
        Accept: "application/json",
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
      headers: {
        Accept: "application/json",
        Authorization: "Bearer session-token",
      },
      body: undefined,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${API_BASE_URL}/api/mobile/v1/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
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
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handoff: "handoff-token" }),
      }
    );
  });
});
