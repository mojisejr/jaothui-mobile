import { API_BASE_URL } from "@/api/client";
import {
  LINE_ACCOUNT_RETURN_TO,
  buildLineAccountAuthUrl,
  parseLineAccountCallbackUrl,
} from "@/auth/lineAccount";

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

describe("LINE account mobile auth helpers", () => {
  it("builds the mobile LINE start URL with the JAOTHUI callback returnTo", () => {
    const url = new URL(buildLineAccountAuthUrl());

    expect(`${url.origin}`).toBe(API_BASE_URL);
    expect(url.pathname).toBe("/oauth/mobile/line/start");
    expect(url.searchParams.get("returnTo")).toBe(LINE_ACCOUNT_RETURN_TO);
  });

  it("extracts LINE handoff only from provider=line callback", () => {
    expect(parseLineAccountCallbackUrl("jaothui://oauth/callback?provider=line&handoff=abc123")).toEqual({
      ok: true,
      handoff: "abc123",
    });
    expect(parseLineAccountCallbackUrl("jaothui://oauth/callback?handoff=abc123")).toMatchObject({
      ok: false,
      reason: "invalid_callback",
    });
  });

  it("reports missing handoff and provider errors", () => {
    expect(parseLineAccountCallbackUrl("jaothui://oauth/callback?provider=line")).toMatchObject({
      ok: false,
      reason: "missing_handoff",
    });
    expect(parseLineAccountCallbackUrl("jaothui://oauth/callback?error=access_denied")).toMatchObject({
      ok: false,
      reason: "provider_error",
      message: "access_denied",
    });
  });
});
