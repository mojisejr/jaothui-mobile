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
export type RegistrationLookup = { buffalo: { name: string; sex: string | null; color: string | null; birthday: string | null; birthdate: number | null } };
export type EventMember = { id: string; tel: string | null; email: string | null; role: string };
export type EventMemberResult = { member: EventMember | null; capability: { canRegister: boolean; reason: string | null } };
export type EventReturnIntent = { kind: "event-apply"; eventId: string } | { kind: "profile-link" };
export type LineLinkStart = { authorizeUrl: string; intentId: string; returnTo: "jaothui://oauth/callback" };
export type LineLinkResult = MobileAccountSession & { returnIntent: EventReturnIntent; replayed: boolean };

export type MemberEnrollment = { firstName: string; lastName: string; tel: string; email?: string | null };
export type RegistrationStatus = "registered" | "pending" | "approved" | "rejected";
export type ApplicantRegistrationStatus = "registered" | "pending" | "accepted" | "rejected" | "needs_type_review";
export type ApplicantPolicy = {
  registrationPolicyVersion?: 1;
  registrationStatus?: ApplicantRegistrationStatus;
  approvalRequirement?: "not_required" | "required" | "unknown";
  checkInVersion?: 1;
  checkInStatus?: "not_checked_in" | "checked_in";
  checkedInAt?: string | null;
  qrAvailable?: boolean;
  checkInEligibility?: { eligible: boolean; reason: string | null };
};
export type RegistrationSummary = ApplicantPolicy & {
  statusRefreshPending?: true;
  id: string;
  event: { id: string; name: string; eventType: "normal" | "royal" | null; startDay: string | null; endDay: string | null };
  buffalo: { name: string; microchip: string; sex: string; color: string; birthday: string; age: number | null; type: string; level: string };
  status: RegistrationStatus;
  approvalComment: string | null;
  createdAt: string;
};
export type RegistrationDetail = RegistrationSummary & {
  ownerName: string; ownerTel: string; fatherName: string; motherName: string; farmName: string; province: string;
  images?: { imageTitle: string; url: string | null }[];
  address?: { address: string; district: string; amphoe: string; province: string; zipcode: string } | null;
};
export type RegistrationHistory = { eventNames?: string[]; items: RegistrationSummary[]; nextCursor: string | null };
export type RegistrationRequest = {
  operationId: string; type: string; level: "จังหวัด" | "ประเทศ"; name: string; sex: "male" | "female";
  color: "black" | "albino"; birthdate: string; microchip: string; ownerName: string; ownerTel: string;
  fatherName: string; motherName: string; farmName: string; province: string; buffaloAge: number;
  agreements: Record<string, true>;
  address?: string; district?: string; amphoe?: string; zipcode?: string; imageIds?: string[];
};
export type RegistrationResult = { registration: RegistrationDetail; replayed: boolean };
export type RegistrationPass = { registration: RegistrationDetail; qrUrl: string };
