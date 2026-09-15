import { mobileGet, mobilePost, mobilePostWithAuth } from "@/api/client";
import { saveMobileSession } from "@/auth/sessionStorage";
import type {
  MobileReviewerAccountSession,
  MobileReviewerAvailability,
  MobileReviewerWalletFixture,
} from "@/types/mobile-api";

const AVAILABILITY_ENDPOINT = "/api/mobile/v2/auth/reviewer-availability";
const SESSION_ENDPOINT = "/api/mobile/v2/auth/reviewer-session";
const WALLET_FIXTURE_ENDPOINT = "/api/mobile/v2/reviewer/wallet-fixture";

export function getReviewerSandboxAvailability() {
  return mobileGet<MobileReviewerAvailability>(AVAILABILITY_ENDPOINT);
}

export async function completeReviewerSandboxSignIn(input: {
  username: string;
  password: string;
}) {
  const session = await mobilePost<MobileReviewerAccountSession>(SESSION_ENDPOINT, {
    username: input.username.trim(),
    password: input.password,
  });
  await saveMobileSession(session);
  return session;
}

export function updateReviewerWalletFixture(sessionToken: string, linked: boolean) {
  return mobilePostWithAuth<MobileReviewerWalletFixture>(
    WALLET_FIXTURE_ENDPOINT,
    { linked },
    sessionToken
  );
}
