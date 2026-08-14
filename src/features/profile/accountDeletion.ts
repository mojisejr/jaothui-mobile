import { deleteAccount } from "@/api/jaothui";
import { clearMobileSession } from "@/auth/sessionStorage";
import type { MobileAccountDeletionReceipt } from "@/types/mobile-api";

type AccountDeletionDependencies = {
  clearSession: () => Promise<void>;
  deleteAccount: (sessionToken: string) => Promise<MobileAccountDeletionReceipt>;
};

export type AccountDeletionResult = {
  localSessionCleared: boolean;
  receipt: MobileAccountDeletionReceipt;
};

const defaultDependencies: AccountDeletionDependencies = {
  clearSession: clearMobileSession,
  deleteAccount,
};

export async function deleteAccountThenClearSession(
  sessionToken: string,
  dependencies: AccountDeletionDependencies = defaultDependencies
) {
  const receipt = await dependencies.deleteAccount(sessionToken);
  try {
    await dependencies.clearSession();
    return { localSessionCleared: true, receipt } satisfies AccountDeletionResult;
  } catch {
    // The server receipt is authoritative: its account deletion has already
    // completed. Keep the UI disconnected even if this device cannot erase
    // its cached JWT, which the active-account guard will reject on reuse.
    return { localSessionCleared: false, receipt } satisfies AccountDeletionResult;
  }
}
