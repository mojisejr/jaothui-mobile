import { API_BASE_URL } from "@/api/client";
import {
  BITKUB_NEXT_RETURN_TO,
  buildBitkubNextAuthUrl,
  parseBitkubNextCallbackUrl,
} from "@/auth/bitkubNext";

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

describe("Bitkub NEXT mobile auth helpers", () => {
  it("builds the web bridge start URL with the JAOTHUI callback returnTo", () => {
    const url = new URL(buildBitkubNextAuthUrl());

    expect(`${url.origin}`).toBe(API_BASE_URL);
    expect(url.pathname).toBe("/oauth/mobile/start");
    expect(url.searchParams.get("returnTo")).toBe(BITKUB_NEXT_RETURN_TO);
  });

  it("extracts the handoff from a JAOTHUI OAuth callback URL", () => {
    expect(parseBitkubNextCallbackUrl("jaothui://oauth/callback?handoff=abc123")).toEqual({
      ok: true,
      handoff: "abc123",
      purpose: "login",
    });
    expect(
      parseBitkubNextCallbackUrl("jaothui://oauth/callback?provider=bitkub-next&purpose=link&handoff=abc123")
    ).toEqual({
      ok: true,
      handoff: "abc123",
      purpose: "link",
    });
  });

  it("rejects callback URLs outside the JAOTHUI OAuth callback", () => {
    expect(parseBitkubNextCallbackUrl("jaothui://profile?handoff=abc123")).toMatchObject({
      ok: false,
      reason: "invalid_callback",
    });
  });

  it("reports missing handoff and provider errors without redeeming", () => {
    expect(parseBitkubNextCallbackUrl("jaothui://oauth/callback")).toMatchObject({
      ok: false,
      reason: "missing_handoff",
    });
    expect(parseBitkubNextCallbackUrl("jaothui://oauth/callback?error=access_denied")).toMatchObject({
      ok: false,
      reason: "provider_error",
      message: "access_denied",
    });
  });
});
