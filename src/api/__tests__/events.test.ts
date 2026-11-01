import { enrollEventMember, uploadEventImage, submitEventRegistration, getEventRegistrations, getEventRegistration, getEventRegistrationPass } from "../events";
import type { RegistrationRequest } from "@/types/events";
describe("curated native event transport", () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  it("uses only BFF customer routes/Bearer and sends rawJPEG, not JSON/base64/provider credentials", async () => {
    const request = jest.fn(async () => ({ status: 200, json: async () => ({ ok: true, data: {} }) })); global.fetch = request as unknown as typeof fetch;
    await enrollEventMember("account-session", { firstName: "ชื่อ", lastName: "นามสกุล", tel: "0812345678", email: null });
    await uploadEventImage("account-session", "event-a", new Uint8Array([255, 216, 255, 3]));
    const options = (request.mock.calls as unknown as [string, RequestInit][])[1][1];
    expect(options.headers).toMatchObject({ Authorization: "Bearer account-session", "Content-Type": "image/jpeg" }); expect(options.body).toBeInstanceOf(ArrayBuffer); expect(new Uint8Array(options.body as ArrayBuffer)).toEqual(new Uint8Array([255, 216, 255, 3]));
    const payload = { operationId: "same-original", buffaloAge: 36 } as RegistrationRequest;
    await submitEventRegistration("account-session", "event-a", payload); await getEventRegistrations("account-session", "cursor+next"); await getEventRegistration("account-session", "competition-registration.a");
    const calls = request.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(call => new URL(call[0]).pathname)).toEqual(["/api/mobile/v2/event-member", "/api/mobile/v2/events/event-a/images", "/api/mobile/v2/events/event-a/registrations", "/api/mobile/v2/event-registrations", "/api/mobile/v2/event-registrations/competition-registration.a"]);
    expect(calls[2][1].body).toBe(JSON.stringify(payload)); expect(new URL(calls[3][0]).searchParams.get("cursor")).toBe("cursor+next");
  });
  it("requests a pass only with the existing BFF session and no claimed applicant identity", async () => {
    const request = jest.fn(async () => ({ status: 200, json: async () => ({ ok: true, data: { registration: {}, qrUrl: "https://example.test/pass" } }) })); global.fetch = request as unknown as typeof fetch;
    await getEventRegistrationPass("existing-account-session", "registration.with.dot");
    const [url, options] = (request.mock.calls as unknown as [string, RequestInit][])[0];
    expect(new URL(url).pathname).toBe("/api/mobile/v2/event-registrations/registration.with.dot/pass");
    expect(options.method).toBe("POST"); expect(options.body).toBe("{}");
    expect(options.headers).toMatchObject({ Authorization: "Bearer existing-account-session" });
    expect(url).not.toContain("existing-account-session");
  });
});
