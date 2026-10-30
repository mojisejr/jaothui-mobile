import * as WebBrowser from "expo-web-browser";
import { startEventLineLink } from "@/api/events";
import { oauthCompletion } from "./oauthCompletion";

export async function openEventLineLink(eventId?: string) {
  const begun = await oauthCompletion.begin("link", eventId ?? null);
  const server = await startEventLineLink(begun.session!.sessionToken, eventId ? { kind: "event-apply", eventId } : { kind: "profile-link" });
  await oauthCompletion.bindServerIntent(begun.intent, server.intentId, begun.generation);
  if (server.returnTo !== "jaothui://oauth/callback") throw new Error("ปลายทางยืนยันตัวตนไม่ถูกต้อง");
  const result = await WebBrowser.openAuthSessionAsync(server.authorizeUrl, server.returnTo);
  if (result.type !== "success") return { ok: false as const, target: await oauthCompletion.cancel(begun.intent.flowId) };
  const completion = await oauthCompletion.complete(result.url, begun.intent.flowId);
  return { ok: true as const, ...completion };
}

export const openProfileLineLink = () => openEventLineLink();
