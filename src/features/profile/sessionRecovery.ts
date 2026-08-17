import { MobileApiError } from "@/api/client";
import { clearMobileSession } from "@/auth/sessionStorage";

type ClearSession = () => Promise<void>;

export async function recoverRejectedMobileSession(
  error: unknown,
  clearSession: ClearSession = clearMobileSession
): Promise<boolean> {
  if (!(error instanceof MobileApiError) || error.status !== 401) {
    return false;
  }

  try {
    await clearSession();
  } catch {
    // The current screen must still stop retrying the rejected in-memory token.
  }

  return true;
}
