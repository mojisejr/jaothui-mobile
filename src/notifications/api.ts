import { mobileRequest } from "@/api/client";

export const NOTIFICATION_PROJECT_ID = "41406db1-3e4f-4663-b7d9-f71f83e2f32d";
const endpoint = "/api/mobile/v1/notifications/installation";
export type InstallationStatus = { available: boolean; enabled: boolean; bindingGeneration: number | null };
export type NotificationBinding = { installationId: string; accountId: string; bindingGeneration: number; revocationToken: string; expoPushToken?: string };
export type Revocation = Pick<NotificationBinding, "installationId" | "revocationToken">;

async function bounded<T>(read: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try { return await read(controller.signal); } finally { clearTimeout(timer); }
}
export const getNotificationStatus = (installationId: string, token: string) => bounded(signal =>
  mobileRequest<InstallationStatus>(`${endpoint}?${new URLSearchParams({ installationId })}`, { bearerToken: token, signal }));
export const bindNotificationInstallation = (input: { installationId: string; platform: "android" | "ios"; expoPushToken: string }, token: string) => bounded(signal =>
  mobileRequest<{ available: true; enabled: true; bindingGeneration: number; revocationToken: string }>(endpoint, { method: "PUT", body: input, bearerToken: token, signal }));
export const revokeNotificationInstallation = (input: Revocation) => bounded(signal =>
  mobileRequest<{ enabled: false }>("/api/notifications/revoke", { method: "POST", body: input, signal }));
