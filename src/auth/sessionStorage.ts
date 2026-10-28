import * as SecureStore from "expo-secure-store";
import type {
  MobileAccountSession,
  MobileBitkubNextSession,
  MobileSession,
} from "@/types/mobile-api";
import { advanceSessionGeneration, currentSessionGeneration, serializeAuthWrite } from "./sessionLifecycle";
import { eraseOAuthIntent, readOAuthIntent, writeOAuthIntent, sessionIdentity } from "./oauthIntentStorage";

const SESSION_KEY = "jaothui.mobileSession.v1";

export type SecureStoreAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
  isAvailableAsync?: () => Promise<boolean>;
};

export class MobileSessionStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MobileSessionStorageError";
  }
}

async function assertStorageAvailable(storage: SecureStoreAdapter) {
  if (storage.isAvailableAsync && !(await storage.isAvailableAsync())) {
    throw new MobileSessionStorageError("Secure session storage is not available on this device");
  }
}

function isMobileBitkubNextSession(value: unknown): value is MobileBitkubNextSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MobileBitkubNextSession>;
  return (
    typeof candidate.sessionToken === "string" &&
    typeof candidate.expiresAt === "number" &&
    !!candidate.identity &&
    (candidate.identity.sessionVersion === undefined || candidate.identity.sessionVersion === 1) &&
    typeof candidate.identity.walletAddress === "string" &&
    candidate.identity.provider === "bitkub-next"
  );
}

function isMobileAccountSession(value: unknown): value is MobileAccountSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MobileAccountSession>;
  const identity = candidate.identity;
  if (
    typeof candidate.sessionToken !== "string" ||
    typeof candidate.expiresAt !== "number" ||
    !identity ||
    identity.sessionVersion !== 2 ||
    (identity.provider !== "line" && identity.provider !== "apple" && identity.provider !== "reviewer") ||
    typeof identity.accountId !== "string" ||
    !identity.accountId.trim() ||
    typeof identity.providerUserId !== "string" ||
    !identity.providerUserId.trim()
  ) {
    return false;
  }

  if (
    identity.provider === "line" &&
    (typeof identity.lineUserId !== "string" || !identity.lineUserId.trim())
  ) {
    return false;
  }

  if (
    identity.provider === "apple" &&
    (typeof identity.appleUserId !== "string" || !identity.appleUserId.trim())
  ) {
    return false;
  }

  // The reviewer session response is intentionally minimal. It must never carry
  // a customer identity or a persisted Bitkub wallet snapshot in SecureStore.
  if (identity.provider === "reviewer") {
    const reviewerIdentity = identity as typeof identity & {
      lineUserId?: unknown;
      appleUserId?: unknown;
      linkedWallet?: unknown;
    };
    return (
      reviewerIdentity.lineUserId === undefined &&
      reviewerIdentity.appleUserId === undefined &&
      reviewerIdentity.linkedWallet === undefined
    );
  }

  if (identity.linkedWallet === null) return true;
  return (
    !!identity.linkedWallet &&
    identity.linkedWallet.provider === "bitkub-next" &&
    typeof identity.linkedWallet.walletAddress === "string" &&
    !!identity.linkedWallet.walletAddress.trim()
  );
}

function isMobileSession(value: unknown): value is MobileSession {
  return isMobileBitkubNextSession(value) || isMobileAccountSession(value);
}

function toUnixSeconds(nowMs: number) {
  return Math.floor(nowMs / 1000);
}

export async function saveMobileSession(
  session: MobileSession,
  storage: SecureStoreAdapter = SecureStore,
  guard?: { generation: number; flowId: string; expectedIdentity?: string }
) {
  const generation = guard?.generation ?? advanceSessionGeneration();
  return serializeAuthWrite(async () => {
    await assertStorageAvailable(storage);
    if (currentSessionGeneration() !== generation) throw new MobileSessionStorageError("Session changed while authentication was pending");
    if (guard) {
      const intent = await readOAuthIntent(storage);
      if (intent?.flowId !== guard.flowId) throw new MobileSessionStorageError("Authentication intent is no longer current");
      const raw = await storage.getItemAsync(SESSION_KEY);
      const current = raw ? JSON.parse(raw) as MobileSession : null;
      if (guard.expectedIdentity && sessionIdentity(current) !== guard.expectedIdentity) throw new MobileSessionStorageError("Account changed while authentication was pending");
      if (currentSessionGeneration() !== generation) throw new MobileSessionStorageError("Session changed while authentication was pending");
      if (session.identity.sessionVersion !== 2) throw new MobileSessionStorageError("Expected JAOTHUI Account");
      // Persist a bounded receipt before the session. A killed process or failed
      // session write can safely retry; a saved session can recover its target.
      await writeOAuthIntent({ ...intent, status: "completed", completedAccountId: session.identity.accountId }, storage);
    }
    if (!guard) await eraseOAuthIntent(storage);
    await storage.setItemAsync(SESSION_KEY, JSON.stringify(session));
  });
}

export async function clearMobileSession(storage: SecureStoreAdapter = SecureStore) {
  advanceSessionGeneration();
  return serializeAuthWrite(async () => {
    await storage.deleteItemAsync(SESSION_KEY);
    await eraseOAuthIntent(storage);
  });
}

export async function loadMobileSession(
  storage: SecureStoreAdapter = SecureStore,
  nowMs = Date.now()
): Promise<MobileSession | null> {
  await assertStorageAvailable(storage);
  const raw = await storage.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isMobileSession(parsed)) {
      await clearMobileSession(storage);
      return null;
    }

    if (parsed.expiresAt <= toUnixSeconds(nowMs)) {
      await clearMobileSession(storage);
      return null;
    }

    return parsed;
  } catch {
    await clearMobileSession(storage);
    return null;
  }
}

export async function loadMobileSessionToken(storage: SecureStoreAdapter = SecureStore) {
  const session = await loadMobileSession(storage);
  return session?.sessionToken ?? null;
}
