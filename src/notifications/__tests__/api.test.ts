import { bindNotificationInstallation, getNotificationStatus, revokeNotificationInstallation } from "../api";
describe("notification API wire contract", () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  it("uses PUT/Bearer for installation, unwraps the mobile envelope and never claims account identity", async () => {
    const data = { available: true, enabled: true, bindingGeneration: 3, revocationToken: "disable-only-capability" };
    const fetcher = jest.fn(async () => ({ status: 200, json: async () => ({ ok: true, data }) })); global.fetch = fetcher as unknown as typeof fetch;
    const body = { installationId: "9a167970-8905-4ada-a3a2-208ec668d53d", platform: "android" as const, expoPushToken: "ExponentPushToken[fixture]" };
    expect(await bindNotificationInstallation(body, "account-session")).toEqual(data);
    const [url, request] = (fetcher.mock.calls as unknown as [string, RequestInit][])[0];
    expect(new URL(url).pathname).toBe("/api/mobile/v1/notifications/installation"); expect(request.method).toBe("PUT");
    expect(request.headers).toMatchObject({ Authorization: "Bearer account-session", "Content-Type": "application/json" }); expect(JSON.parse(String(request.body))).toEqual(body);
  });
  it("uses the disable-only public handle after logout without retaining/sending a session token", async () => {
    const fetcher = jest.fn(async () => ({ status: 200, json: async () => ({ ok: true, data: { enabled: false } }) })); global.fetch = fetcher as unknown as typeof fetch;
    await revokeNotificationInstallation({ installationId: "9a167970-8905-4ada-a3a2-208ec668d53d", revocationToken: "disable-only-capability" });
    const [url, request] = (fetcher.mock.calls as unknown as [string, RequestInit][])[0];
    expect(new URL(url).pathname).toBe("/api/notifications/revoke"); expect(request.method).toBe("POST"); expect(request.headers).not.toHaveProperty("Authorization");
  });
  it("propagates disabled/failed backend responses instead of inferring enabled from HTTP", async () => {
    global.fetch = jest.fn(async () => ({ status: 503, json: async () => ({ ok: false, error: { code: "PUSH_UNAVAILABLE", message: "not enabled" } }) })) as unknown as typeof fetch;
    await expect(getNotificationStatus("installation", "account-session")).rejects.toMatchObject({ code: "PUSH_UNAVAILABLE", status: 503 });
  });
});
