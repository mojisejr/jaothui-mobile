import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL, mobilePost } from "@/api/client";
import { saveMobileSession } from "@/auth/sessionStorage";
import type { MobileLineAccountSession } from "@/types/mobile-api";

export const LINE_ACCOUNT_RETURN_TO = "jaothui://oauth/callback";
const SESSION_ENDPOINT = "/api/mobile/v2/auth/line/session";

export type LineCallbackParseResult =
  | { ok: true; handoff: string }
  | {
      ok: false;
      reason: "invalid_url" | "invalid_callback" | "missing_handoff" | "provider_error";
      message: string;
    };

export function buildLineAccountAuthUrl(returnTo = LINE_ACCOUNT_RETURN_TO) {
  const url = new URL("/oauth/mobile/line/start", API_BASE_URL);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function parseLineAccountCallbackUrl(url: string): LineCallbackParseResult {
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

    if (parsed.searchParams.get("provider") !== "line") {
      return {
        ok: false,
        reason: "invalid_callback",
        message: "OAuth callback is not a LINE account callback",
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

export async function redeemLineAccountHandoff(handoff: string) {
  return mobilePost<MobileLineAccountSession>(SESSION_ENDPOINT, { handoff });
}

export async function completeLineAccountHandoff(handoff: string) {
  const session = await redeemLineAccountHandoff(handoff);
  await saveMobileSession(session);
  return session;
}

export async function openLineAccountAuthSession() {
  const authUrl = buildLineAccountAuthUrl();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, LINE_ACCOUNT_RETURN_TO);

  if (result.type !== "success") {
    return {
      ok: false as const,
      reason: result.type,
      message: "LINE login was not completed",
    };
  }

  const callback = parseLineAccountCallbackUrl(result.url);
  if (!callback.ok) return callback;

  const session = await completeLineAccountHandoff(callback.handoff);
  return { ok: true as const, session };
}

WebBrowser.maybeCompleteAuthSession();
