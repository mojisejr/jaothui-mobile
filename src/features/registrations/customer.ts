import { MobileApiError } from "@/api/client";
import { loadMobileSession, MobileSessionStorageError } from "@/auth/sessionStorage";
import type { MobileAccountSession } from "@/types/mobile-api";
export type CustomerSession = MobileAccountSession & { identity: Exclude<MobileAccountSession["identity"], { provider: "reviewer" }> };
export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await loadMobileSession();
  if (!session || session.identity.sessionVersion !== 2 || !["line", "apple"].includes(session.identity.provider)) throw new MobileApiError("กรุณาเข้าสู่ระบบด้วย LINE หรือ Apple จากหน้าโปรไฟล์ก่อน", "CUSTOMER_REQUIRED", 403);
  return session as CustomerSession;
}
export async function sameCustomer(session: CustomerSession) {
  const current = await loadMobileSession();
  return !!current && current.identity.sessionVersion === 2 && current.identity.accountId === session.identity.accountId && current.sessionToken === session.sessionToken;
}
export function eventAccountError(error: unknown) {
  if (error instanceof MobileSessionStorageError) return "อุปกรณ์นี้ยังไม่พร้อมสำหรับการเข้าสู่ระบบอย่างปลอดภัย กรุณาลองใหม่ภายหลัง";
  return error instanceof Error ? error.message : "ระบบยังไม่พร้อม กรุณาลองใหม่";
}
