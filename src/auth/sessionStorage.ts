import * as SecureStore from "expo-secure-store";
import type {
  MobileBitkubNextSession,
  MobileLineAccountSession,
  MobileSession,
} from "@/types/mobile-api";

const SESSION_KEY = "jaothui.mobileSession.v1";

type SecureStoreAdapter = {
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

function isMobileLineAccountSession(value: unknown): value is MobileLineAccountSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MobileLineAccountSession>;
  const identity = candidate.identity;
  if (
    typeof candidate.sessionToken !== "string" ||
    typeof candidate.expiresAt !== "number" ||
    !identity ||
    identity.sessionVersion !== 2 ||
    identity.provider !== "line" ||
    typeof identity.accountId !== "string" ||
    !identity.accountId.trim() ||
    typeof identity.lineUserId !== "string" ||
    !identity.lineUserId.trim()
  ) {
    return false;
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
  return isMobileBitkubNextSession(value) || isMobileLineAccountSession(value);
}

function toUnixSeconds(nowMs: number) {
  return Math.floor(nowMs / 1000);
}

export async function saveMobileSession(
  session: MobileSession,
  storage: SecureStoreAdapter = SecureStore
) {
  await assertStorageAvailable(storage);
  await storage.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearMobileSession(storage: SecureStoreAdapter = SecureStore) {
  await storage.deleteItemAsync(SESSION_KEY);
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
