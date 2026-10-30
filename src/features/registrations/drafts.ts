import type { EventDetail, MemberEnrollment, RegistrationResult } from "@/types/events";
import { emptyFields, reconcileClasses, type FormFields } from "./model";
import { nextNormalLevel } from "./normalLevels";
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

/** A new controller must bind to this new draft object; the completed request stays immutable. */
export function beginAnotherNormalRegistration(accountId: string, event: EventDetail, completed: EventDraft): EventDraft {
  if (event.formKind !== "normal" || account !== accountId || completed.accountId !== accountId || completed.eventId !== event.id || drafts.get(event.id) !== completed || !completed.receipt?.registration?.id)
    throw new Error("กรุณายืนยันผลใบสมัครเดิมและบัญชีก่อนเริ่มใบสมัครใหม่");
  const next: EventDraft = { ...completed,
    fields: reconcileClasses(event, { ...completed.fields, normalSelectionVersion: 1, level: nextNormalLevel(completed.receipt.registration.buffalo.level), type: "", classMode: "auto" }),
    agreements: {}, pending: undefined, receipt: undefined, dirty: true };
  drafts.set(event.id, next);
  return next;
}
