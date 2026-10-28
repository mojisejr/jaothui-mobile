import type { MemberEnrollment, RegistrationResult } from "@/types/events";
import { emptyFields, type FormFields } from "./model";
import { emptyPhotos, type PhotoSlot } from "./photos";
import type { PendingSubmission } from "./submission";
export type EventDraft = { accountId: string; eventId: string; fields: FormFields; agreements: Record<string, boolean>; photos: PhotoSlot[]; member: MemberEnrollment; pending?: PendingSubmission; receipt?: RegistrationResult; dirty: boolean };
// Bounded memory only: no PII in URLs, web storage or process-death persistence claim.
let account: string | null = null;
const drafts = new Map<string, EventDraft>();
export function eventDraft(accountId: string, eventId: string): EventDraft {
  if (account !== accountId) { drafts.clear(); account = accountId; }
  let draft = drafts.get(eventId);
  if (!draft) {
    if (drafts.size >= 3) {
      const removable = [...drafts.entries()].find(([, d]) => !d.pending || d.pending.state === "rejected" || d.receipt);
      if (!removable) throw new Error("มีคำขอเดิมที่ยังตรวจสอบผลไม่ได้ กรุณากลับไปตรวจสอบก่อนเริ่มใบสมัครใหม่");
      drafts.delete(removable[0]);
    }
    draft = { accountId, eventId, fields: emptyFields(), agreements: {}, photos: emptyPhotos(), member: { firstName: "", lastName: "", tel: "", email: "" }, dirty: false };
    drafts.set(eventId, draft);
  }
  return draft;
}
export function discardEventDraft(accountId: string, eventId: string) { if (account === accountId) drafts.delete(eventId); }
