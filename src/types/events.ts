import type { MobileAccountSession } from "./mobile-api";

export type EventRegistrationStatus = "not-yet" | "open" | "closed-manual" | "closed-date" | "unavailable" | "invalid";
export type EventSummary = {
  id: string;
  name: string;
  eventType: "normal" | "royal";
  imageUrl: string | null;
  competitionStartDay: string | null;
  competitionEndDay: string | null;
  registrationStartDay: string | null;
  registrationDeadline: string | null;
  publicRegistration: EventRegistrationStatus;
  location: string | null;
};
export type EventList = { items: EventSummary[]; totalOpen: number; nextCursor: string | null; observedAt: string };
export type EventQuery = { q?: string; from?: string; to?: string; limit?: number; cursor?: string };
export type EventDetail = EventSummary & {
  description: string | null;
  metadata: string[];
  ageCutoffDay: string | null;
  policy: { lifecycle: string; publicRegistration: EventRegistrationStatus; warnings: string[]; publicVisible: boolean };
  catalogs: { level: "จังหวัด" | "ประเทศ"; labels: string[] }[];
  formKind: "normal" | "royal";
};
export type EventMember = { id: string; tel: string | null; email: string | null; role: string };
export type EventMemberResult = { member: EventMember | null; capability: { canRegister: boolean; reason: string | null } };
export type EventReturnIntent = { kind: "event-apply"; eventId: string } | { kind: "profile-link" };
export type LineLinkStart = { authorizeUrl: string; intentId: string; returnTo: "jaothui://oauth/callback" };
export type LineLinkResult = MobileAccountSession & { returnIntent: EventReturnIntent; replayed: boolean };
