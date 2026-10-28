import { mobileGetWithAuth, mobilePostWithAuth, mobileRequest } from "./client";
import type { EventDetail, EventList, EventMemberResult, EventQuery, EventReturnIntent, LineLinkResult, LineLinkStart } from "@/types/events";

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
