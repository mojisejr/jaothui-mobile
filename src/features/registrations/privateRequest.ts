import { MobileApiError } from "@/api/client";
import { recoverRejectedMobileSession } from "@/features/profile/sessionRecovery";
import { requireCustomerSession, sameCustomer, type CustomerSession } from "./customer";
export async function eventPrivateRequest<T>(read: (session: CustomerSession) => Promise<T>) {
  const session = await requireCustomerSession();
  try {
    const value = await read(session);
    if (!await sameCustomer(session)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่");
    return { session, value };
  } catch (error) {
    if (error instanceof MobileApiError && error.status === 401 && await sameCustomer(session)) await recoverRejectedMobileSession(error);
    throw error;
  }
}
