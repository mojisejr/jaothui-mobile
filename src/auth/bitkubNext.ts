import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL, mobilePost } from "@/api/client";
import { saveMobileSession } from "@/auth/sessionStorage";
import type { MobileBitkubNextSession } from "@/types/mobile-api";

export const BITKUB_NEXT_RETURN_TO = "jaothui://oauth/callback";
const SESSION_ENDPOINT = "/api/mobile/v1/auth/bitkub-next/session";

export type OAuthCallbackParseResult =
  | { ok: true; handoff: string }
  | {
      ok: false;
      reason: "invalid_url" | "invalid_callback" | "missing_handoff" | "provider_error";
      message: string;
    };

export function buildBitkubNextAuthUrl(returnTo = BITKUB_NEXT_RETURN_TO) {
  const url = new URL("/oauth/mobile/start", API_BASE_URL);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function parseBitkubNextCallbackUrl(url: string): OAuthCallbackParseResult {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "jaothui:" || parsed.hostname !== "oauth" || parsed.pathname !== "/callback") {
      return {
        ok: false,
        reason: "invalid_callback",
        message: "OAuth callback URL does not match the JAOTHUI mobile callback",
      };
    }

    const providerError = parsed.searchParams.get("error");
    if (providerError) {
      return {
        ok: false,
        reason: "provider_error",
        message: providerError,
      };
    }

    const handoff = parsed.searchParams.get("handoff")?.trim();
    if (!handoff) {
      return {
        ok: false,
        reason: "missing_handoff",
        message: "OAuth callback is missing a handoff token",
      };
    }

    return { ok: true, handoff };
  } catch {
    return {
      ok: false,
      reason: "invalid_url",
      message: "OAuth callback URL is invalid",
    };
  }
}

export async function redeemBitkubNextHandoff(handoff: string) {
  return mobilePost<MobileBitkubNextSession>(SESSION_ENDPOINT, { handoff });
}

export async function completeBitkubNextHandoff(handoff: string) {
  const session = await redeemBitkubNextHandoff(handoff);
  await saveMobileSession(session);
  return session;
}

export async function openBitkubNextAuthSession() {
  const authUrl = buildBitkubNextAuthUrl();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, BITKUB_NEXT_RETURN_TO);

  if (result.type !== "success") {
    return {
      ok: false as const,
      reason: result.type,
      message: "Bitkub NEXT login was not completed",
    };
  }

  const callback = parseBitkubNextCallbackUrl(result.url);
  if (!callback.ok) return callback;

  const session = await completeBitkubNextHandoff(callback.handoff);
  return { ok: true as const, session };
}

WebBrowser.maybeCompleteAuthSession();
