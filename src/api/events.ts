import { mobileGetWithAuth, mobilePostWithAuth, mobileRequest } from "./client";
import type { MemberEnrollment, RegistrationDetail, RegistrationHistory, RegistrationRequest, RegistrationResult, EventMember, EventDetail, EventList, EventMemberResult, EventQuery, EventReturnIntent, LineLinkResult, LineLinkStart } from "@/types/events";

export function eventQueryString(query: EventQuery = {}) {
  const params = new URLSearchParams();
  for (const key of ["q", "from", "to", "cursor"] as const) if (query[key]) params.set(key, query[key]!);
  params.set("limit", String(query.limit ?? 20));
  return params.toString();
}
export function getOpenEvents(query: EventQuery = {}, signal?: AbortSignal) {
  return mobileRequest<EventList>(`/api/mobile/v2/events?${eventQueryString(query)}`, { signal });
}
export function getEventDetail(eventId: string, signal?: AbortSignal) {
  return mobileRequest<EventDetail>(`/api/mobile/v2/events/${encodeURIComponent(eventId)}`, { signal });
}
export function getRegistrationBuffalo(token: string, microchip: string) {
  return mobileGetWithAuth<import("@/types/events").RegistrationLookup>(`/api/mobile/v2/event-registration-lookup?${new URLSearchParams({ microchip })}`, token);
}
export function getEventMember(token: string) {
  return mobileGetWithAuth<EventMemberResult>("/api/mobile/v2/event-member", token);
}
export function startEventLineLink(token: string, returnIntent: EventReturnIntent) {
  return mobilePostWithAuth<LineLinkStart>("/api/mobile/v2/auth/line-link/start", { returnIntent }, token);
}
export function redeemEventLineLink(token: string, intentId: string, handoff: string) {
  return mobilePostWithAuth<LineLinkResult>("/api/mobile/v2/auth/line-link/redeem", { intentId, handoff }, token);
}
export function cancelEventLineLink(token: string, intentId: string) {
  return mobileRequest<{ cancelled: boolean }>("/api/mobile/v2/auth/line-link/start", { method: "DELETE", body: { intentId }, bearerToken: token });
}

export function enrollEventMember(token: string, fields: MemberEnrollment) {
  return mobilePostWithAuth<{ member: EventMember; created: boolean }>("/api/mobile/v2/event-member", fields, token);
}
export function getEventRegistrations(token: string, cursor?: string, period: "active" | "past" | "all" = "all", q = "") {
  const params = new URLSearchParams({ limit: "20", period, q });
  if (cursor) params.set("cursor", cursor);
  return mobileGetWithAuth<RegistrationHistory>(`/api/mobile/v2/event-registrations?${params}`, token);
}
export function getEventRegistration(token: string, id: string) {
  return mobileGetWithAuth<RegistrationDetail>(`/api/mobile/v2/event-registrations/${encodeURIComponent(id)}`, token);
}
export function submitEventRegistration(token: string, eventId: string, payload: RegistrationRequest) {
  return mobilePostWithAuth<RegistrationResult>(`/api/mobile/v2/events/${encodeURIComponent(eventId)}/registrations`, payload, token);
}
export function uploadEventImage(token: string, eventId: string, bytes: Uint8Array) {
  return mobileRequest<{ assetId: string }>(`/api/mobile/v2/events/${encodeURIComponent(eventId)}/images`, {
    method: "POST", bearerToken: token, contentType: "image/jpeg", rawBody: new Uint8Array(bytes).buffer,
  });
}
