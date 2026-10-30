import * as SecureStore from "expo-secure-store";
import { mobilePost } from "@/api/client";
import { redeemEventLineLink, cancelEventLineLink } from "@/api/events";
import type { MobileLineAccountSession, MobileSession } from "@/types/mobile-api";
import type { LineLinkResult } from "@/types/events";
import { loadMobileSession, saveMobileSession, type SecureStoreAdapter } from "./sessionStorage";
import { advanceSessionGeneration, currentSessionGeneration, serializeAuthWrite } from "./sessionLifecycle";
import { eraseOAuthIntent, readOAuthIntent, writeOAuthIntent, OAUTH_INTENT_TTL_MS, sessionIdentity, validEventId, type OAuthIntent } from "./oauthIntentStorage";

type Completion = { target: string; session: MobileSession; eventId: string | null };
type Dependencies = {
  storage: SecureStoreAdapter;
  loadSession: () => Promise<MobileSession | null>;
  saveSession: (session: MobileSession, guard: { generation: number; flowId: string; expectedIdentity?: string }) => Promise<void>;
  redeemLogin: (handoff: string, clientFlowId: string) => Promise<MobileLineAccountSession & { clientFlowId?: string }>;
  redeemLink: (token: string, intentId: string, handoff: string) => Promise<LineLinkResult>;
  cancelLink: (token: string, intentId: string) => Promise<unknown>;
  now: () => number;
};

export function createOAuthCompletion(deps: Dependencies) {
  const pending = new Map<string, Promise<Completion>>();
  const target = (intent: OAuthIntent) => intent.eventId ? `/events/${encodeURIComponent(intent.eventId)}` : "/profile";
  const stillCurrent = async (intent: OAuthIntent, generation: number) => {
    if (generation !== currentSessionGeneration() || (await readOAuthIntent(deps.storage, deps.now()))?.flowId !== intent.flowId) throw new Error("ขั้นตอนเข้าสู่ระบบนี้สิ้นสุดแล้ว");
  };
  async function begin(kind: "login" | "link", eventId: string | null = null) {
    if (eventId !== null && !validEventId(eventId)) throw new Error("ไม่พบกิจกรรม");
    const priorGeneration = currentSessionGeneration(), session = await deps.loadSession();
    if (priorGeneration !== currentSessionGeneration()) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาเริ่มใหม่");
    if (kind === "link" && (!session || session.identity.sessionVersion !== 2 || !["line", "apple"].includes(session.identity.provider))) throw new Error("กรุณาเข้าสู่ระบบบัญชี JAOTHUI ก่อน");
    const now = deps.now(), generation = advanceSessionGeneration();
    const intent: OAuthIntent = { flowId: `${now.toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, kind, eventId,
      expectedIdentity: sessionIdentity(session), createdAt: now, expiresAt: now + OAUTH_INTENT_TTL_MS, status: "pending" };
    await serializeAuthWrite(async () => { if (generation !== currentSessionGeneration()) throw new Error("บัญชีเปลี่ยนแล้ว"); await writeOAuthIntent(intent, deps.storage); });
    return { intent, session, generation };
  }
  async function bindServerIntent(intent: OAuthIntent, serverIntentId: string, generation: number) {
    if (!/^[a-f0-9]{64}$/.test(serverIntentId)) throw new Error("ขั้นตอนเชื่อมต่อไม่ถูกต้อง");
    await serializeAuthWrite(async () => { await stillCurrent(intent, generation); await writeOAuthIntent({ ...intent, serverIntentId }, deps.storage); });
  }
  async function cancel(flowId?: string) {
    const intent = await readOAuthIntent(deps.storage, deps.now());
    if (!intent || (flowId && flowId !== intent.flowId)) return null;
    advanceSessionGeneration();
    await serializeAuthWrite(async () => { if ((await readOAuthIntent(deps.storage, deps.now()))?.flowId === intent.flowId) await eraseOAuthIntent(deps.storage); });
    if (intent.kind === "link" && intent.serverIntentId) {
      const session = await deps.loadSession();
      if (sessionIdentity(session) === intent.expectedIdentity && session) {
        try { await deps.cancelLink(session.sessionToken, intent.serverIntentId); } catch { /* Local cancellation remains authoritative; server intent expires. */ }
      }
    }
    return intent.eventId ? `/events/${encodeURIComponent(intent.eventId)}` : "/profile";
  }
  async function complete(url: string, expectedFlowId?: string): Promise<Completion> {
    const parsed = new URL(url);
    if (parsed.protocol !== "jaothui:" || parsed.hostname !== "oauth" || parsed.pathname !== "/callback" || parsed.searchParams.get("provider") !== "line") throw new Error("ลิงก์ยืนยันตัวตนไม่ถูกต้อง");
    const intent = await readOAuthIntent(deps.storage, deps.now());
    if (!intent || (expectedFlowId && expectedFlowId !== intent.flowId)) throw new Error("ขั้นตอนเข้าสู่ระบบหมดอายุ กรุณาเริ่มใหม่");
    const linking = parsed.searchParams.get("purpose") === "link", flowId = parsed.searchParams.get("clientFlowId");
    if (linking !== (intent.kind === "link")) throw new Error("ขั้นตอนยืนยันตัวตนไม่ตรงกัน");
    if (intent.kind === "login" && flowId !== intent.flowId) throw new Error("ขั้นตอนเข้าสู่ระบบไม่ใช่รายการปัจจุบัน");
    if (linking && parsed.searchParams.get("intentId") !== intent.serverIntentId) throw new Error("ขั้นตอนเชื่อมต่อไม่ตรงกับบัญชีนี้");
    const inFlight = pending.get(intent.flowId);
    if (inFlight) return inFlight;
    const current = await deps.loadSession();
    if (intent.status === "completed") {
      if (current && current.identity.sessionVersion === 2 && current.identity.accountId === intent.completedAccountId) {
        return { target: target(intent), session: current, eventId: intent.eventId };
      }
      if (sessionIdentity(current) !== intent.expectedIdentity) throw new Error("บัญชีเปลี่ยนแล้ว");
      // Receipt was persisted but session write did not finish: retry the exact handoff.
    }
    if (sessionIdentity(current) !== intent.expectedIdentity) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาเริ่มใหม่");
    if (parsed.searchParams.has("error")) throw new Error("ยกเลิกหรือยืนยันตัวตนไม่สำเร็จ สามารถกลับไปเริ่มใหม่ได้");
    const handoff = parsed.searchParams.get("handoff");
    if (!handoff || handoff.length > 8192) throw new Error("ไม่พบข้อมูลยืนยันตัวตน");
    const existing = pending.get(intent.flowId);
    if (existing) return existing;
    const generation = currentSessionGeneration();
    const operation = (async () => {
      let session: MobileSession;
      if (intent.kind === "link") {
        if (!current || current.identity.sessionVersion !== 2 || current.identity.provider === "reviewer") throw new Error("ไม่พบบัญชีเดิมสำหรับเชื่อมต่อ");
        const result = await deps.redeemLink(current.sessionToken, intent.serverIntentId!, handoff);
        if (result.identity.provider === "reviewer" || result.identity.accountId !== current.identity.accountId || result.identity.provider !== current.identity.provider || result.identity.providerUserId !== current.identity.providerUserId) throw new Error("บัญชีที่ส่งกลับมาไม่ตรงกับบัญชีเดิม");
        if (intent.eventId ? (result.returnIntent.kind !== "event-apply" || result.returnIntent.eventId !== intent.eventId) : result.returnIntent.kind !== "profile-link") throw new Error("กิจกรรมที่ส่งกลับมาไม่ตรงกัน");
        session = result;
      } else {
        const result = await deps.redeemLogin(handoff, intent.flowId);
        if (result.clientFlowId !== intent.flowId) throw new Error("ไม่สามารถยืนยันขั้นตอนเข้าสู่ระบบนี้ได้");
        session = result;
      }
      await stillCurrent(intent, generation);
      if (sessionIdentity(await deps.loadSession()) !== intent.expectedIdentity) throw new Error("บัญชีเปลี่ยนระหว่างยืนยันตัวตน");
      if (session.identity.sessionVersion !== 2) throw new Error("ต้องใช้บัญชี JAOTHUI");
      await deps.saveSession(session, { generation, flowId: intent.flowId, expectedIdentity: intent.expectedIdentity });
      return { target: target(intent), session, eventId: intent.eventId };
    })();
    pending.set(intent.flowId, operation);
    try { return await operation; } finally { pending.delete(intent.flowId); }
  }
  async function exit(url: string) {
    const intent = await readOAuthIntent(deps.storage, deps.now());
    if (!intent) return "/profile";
    const parsed = new URL(url);
    const matches = intent.kind === "link" ? parsed.searchParams.get("intentId") === intent.serverIntentId : parsed.searchParams.get("clientFlowId") === intent.flowId;
    if (!matches) return "/profile"; // An old callback must not cancel a newer intent.
    return await cancel(intent.flowId) ?? "/profile";
  }
  return { begin, bindServerIntent, complete, cancel, exit };
}

export const oauthCompletion = createOAuthCompletion({ storage: SecureStore, loadSession: () => loadMobileSession(),
  saveSession: (session, guard) => saveMobileSession(session, SecureStore, guard),
  redeemLogin: (handoff, clientFlowId) => mobilePost<MobileLineAccountSession & { clientFlowId?: string }>("/api/mobile/v2/auth/line/session", { handoff, clientFlowId }),
  redeemLink: redeemEventLineLink, cancelLink: cancelEventLineLink, now: Date.now });
