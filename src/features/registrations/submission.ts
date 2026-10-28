import { MobileApiError } from "@/api/client";
import type { RegistrationRequest, RegistrationResult } from "@/types/events";
export type PendingSubmission = { payload: RegistrationRequest; state: "sending" | "uncertain" | "rejected"; error?: string };
/** One immutable request survives retries. No new UUID after an uncertain outcome. */
export function createSubmission(send: (payload: RegistrationRequest) => Promise<RegistrationResult>, changed: () => void, initial?: PendingSubmission) {
  let pending = initial, busy = false;
  return {
    get pending() { return pending; },
    get busy() { return busy; },
    edit() {
      if (busy || pending?.state === "uncertain" || pending?.state === "sending") throw new Error("กรุณาตรวจสอบผลคำขอเดิมก่อนแก้ไขข้อมูล");
      pending = undefined; changed();
    },
    async submit(makePayload: () => RegistrationRequest) {
      if (busy) return null;
      busy = true;
      try {
        if (!pending) pending = { payload: JSON.parse(JSON.stringify(makePayload())), state: "sending" };
        else if (pending.state === "rejected") throw new Error("กรุณาตรวจสอบกติกาและเลือกแก้ไขข้อมูลก่อนส่งใหม่");
        pending.state = "sending"; pending.error = undefined; changed();
        try { return await send(pending.payload); }
        catch (error) {
          const definitive = error instanceof MobileApiError && ([400, 403, 413, 422].includes(error.status) || ["REGISTRATION_CLOSED", "EVENT_REVISION_CONFLICT"].includes(error.code));
          pending.state = definitive ? "rejected" : "uncertain";
          pending.error = error instanceof Error ? error.message : "ยังตรวจสอบผลการส่งไม่ได้";
          throw error;
        }
      } finally { busy = false; changed(); }
    },
  };
}
