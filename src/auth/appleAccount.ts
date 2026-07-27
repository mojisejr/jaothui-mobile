import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { mobilePostWithAuth } from "@/api/client";
import { loadMobileSession, saveMobileSession } from "@/auth/sessionStorage";
import type { MobileAppleAccountSession } from "@/types/mobile-api";

const SESSION_ENDPOINT = "/api/mobile/v2/auth/apple/session";

function formatAppleDisplayName(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined
) {
  const parts = [
    fullName?.givenName,
    fullName?.middleName,
    fullName?.familyName,
  ].filter((part): part is string => typeof part === "string" && !!part.trim());

  return parts.length ? parts.join(" ") : null;
}

export async function isAppleAccountAuthAvailable() {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function redeemAppleIdentityToken(input: {
  identityToken: string;
  email?: string | null;
  displayName?: string | null;
  attachToCurrentAccount?: boolean;
}) {
  const currentSession = input.attachToCurrentAccount ? await loadMobileSession() : null;
  const bearerToken =
    currentSession?.identity.sessionVersion === 2 ? currentSession.sessionToken : null;

  return mobilePostWithAuth<MobileAppleAccountSession>(
    SESSION_ENDPOINT,
    {
      identityToken: input.identityToken,
      email: input.email ?? null,
      displayName: input.displayName ?? null,
    },
    bearerToken
  );
}

export async function completeAppleAccountCredential(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  options: { attachToCurrentAccount?: boolean } = {}
) {
  if (!credential.identityToken) {
    return {
      ok: false as const,
      reason: "missing_identity_token",
      message: "Apple did not return an identity token",
    };
  }

  const session = await redeemAppleIdentityToken({
    identityToken: credential.identityToken,
    email: credential.email ?? null,
    displayName: formatAppleDisplayName(credential.fullName),
    attachToCurrentAccount: options.attachToCurrentAccount,
  });

  await saveMobileSession(session);
  return { ok: true as const, session };
}

export async function openAppleAccountAuthSession(
  options: { attachToCurrentAccount?: boolean } = {}
) {
  if (!(await isAppleAccountAuthAvailable())) {
    return {
      ok: false as const,
      reason: "unavailable",
      message: "Sign in with Apple is available on iOS devices only",
    };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    return completeAppleAccountCredential(credential, options);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "ERR_REQUEST_CANCELED"
    ) {
      return {
        ok: false as const,
        reason: "cancelled",
        message: "Apple login was not completed",
      };
    }

    throw error;
  }
}
