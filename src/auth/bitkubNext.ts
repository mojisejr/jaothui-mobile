import * as WebBrowser from "expo-web-browser";
import { API_BASE_URL, mobilePost, mobilePostWithAuth } from "@/api/client";
import { loadMobileSession, saveMobileSession } from "@/auth/sessionStorage";
import type { MobileBitkubNextSession, MobileLineAccountSession } from "@/types/mobile-api";

export const BITKUB_NEXT_RETURN_TO = "jaothui://oauth/callback";
const SESSION_ENDPOINT = "/api/mobile/v1/auth/bitkub-next/session";
const LINK_INTENT_ENDPOINT = "/api/mobile/v2/auth/bitkub-next/link-intent";
const LINK_SESSION_ENDPOINT = "/api/mobile/v2/auth/bitkub-next/link/session";

export type OAuthCallbackParseResult =
  | { ok: true; handoff: string; purpose?: "login" | "link" }
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

    const provider = parsed.searchParams.get("provider");
    const purpose = parsed.searchParams.get("purpose");
    if (provider || purpose) {
      if (provider !== "bitkub-next" || purpose !== "link") {
        return {
          ok: false,
          reason: "invalid_callback",
          message: "OAuth callback is not a Bitkub NEXT mobile callback",
        };
      }

      return { ok: true, handoff, purpose: "link" };
    }

    return { ok: true, handoff, purpose: "login" };
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

type WalletLinkIntent = {
  authUrl: string;
  returnTo: "jaothui://oauth/callback";
};

export async function createBitkubNextWalletLinkIntent(sessionToken: string) {
  return mobilePostWithAuth<WalletLinkIntent>(LINK_INTENT_ENDPOINT, {}, sessionToken);
}

export async function redeemBitkubNextWalletLinkHandoff(
  handoff: string,
  sessionToken: string
) {
  return mobilePostWithAuth<MobileLineAccountSession>(
    LINK_SESSION_ENDPOINT,
    { handoff },
    sessionToken
  );
}

export async function completeBitkubNextWalletLinkHandoff(
  handoff: string,
  sessionToken: string
) {
  const session = await redeemBitkubNextWalletLinkHandoff(handoff, sessionToken);
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

export async function openBitkubNextWalletLinkSession() {
  const currentSession = await loadMobileSession();
  if (!currentSession || currentSession.identity.provider !== "line") {
    return {
      ok: false as const,
      reason: "missing_line_session",
      message: "LINE account session is required before linking Bitkub NEXT",
    };
  }

  const intent = await createBitkubNextWalletLinkIntent(currentSession.sessionToken);
  const result = await WebBrowser.openAuthSessionAsync(intent.authUrl, intent.returnTo);

  if (result.type !== "success") {
    return {
      ok: false as const,
      reason: result.type,
      message: "Bitkub NEXT wallet link was not completed",
    };
  }

  const callback = parseBitkubNextCallbackUrl(result.url);
  if (!callback.ok) return callback;
  if (callback.purpose !== "link") {
    return {
      ok: false as const,
      reason: "invalid_callback",
      message: "OAuth callback is not a Bitkub NEXT wallet link callback",
    };
  }

  const session = await completeBitkubNextWalletLinkHandoff(
    callback.handoff,
    currentSession.sessionToken
  );
  return { ok: true as const, session };
}

WebBrowser.maybeCompleteAuthSession();
