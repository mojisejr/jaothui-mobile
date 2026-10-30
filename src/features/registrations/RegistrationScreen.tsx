import { useCallback, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { randomUUID } from "expo-crypto";
import { getEventDetail, getEventMember, enrollEventMember, submitEventRegistration, uploadEventImage, getRegistrationBuffalo } from "@/api/events";
import { MobileApiError } from "@/api/client";
import type { EventDetail, EventMember } from "@/types/events";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { Skeleton } from "@/components/Skeleton";
import { EventButton } from "@/features/events/EventControls";
import { validEventId } from "@/auth/oauthIntentStorage";
import { recoverRejectedMobileSession } from "@/features/profile/sessionRecovery";
import { eventDraft, discardEventDraft, beginAnotherNormalRegistration, type EventDraft } from "./drafts";
import { sameCustomer, eventAccountError, type CustomerSession } from "./customer";
import { validateMember, buildRegistrationRequest, reconcileClasses, prepareRegistrationFields } from "./model";
import { eventPrivateRequest } from "./privateRequest";
import { createBuffaloLookup } from "./lookup";
import { createSubmission } from "./submission";
import { createPhotoManager } from "./photos";
import { selectApplicantPhoto, normalizeApplicantPhoto, readApplicantBytes } from "./nativePhotos";
import { MemberFormView } from "./MemberFormView";
import { RegistrationFormView } from "./RegistrationFormView";
import { RegistrationDetailView } from "./RegistrationDetailView";
import { CustomerGate } from "./CustomerGate";
import { ExitConfirmation, formStyles } from "./FormControls";
import { useDraftExit } from "./useDraftExit";

type Ready = { session: CustomerSession; event: EventDetail; member: EventMember | null; draft: EventDraft };
export function RegistrationScreen({ memberMode = false }: { memberMode?: boolean }) {
  const router = useRouter(), params = useLocalSearchParams<{ eventId: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const [data, setData] = useState<Ready | null>(null), [error, setError] = useState<unknown>(null), [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [lookupBusy, setLookupBusy] = useState(false), [lookupMessage, setLookupMessage] = useState<string | null>(null), [, render] = useState(0);
  const active = useRef(false), current = useRef<Ready | null>(null), epoch = useRef(0), lock = useRef(false);
  const refreshUI = useCallback(() => render(n => n + 1), []);
  const load = useCallback(() => {
    const request = ++epoch.current; setError(null); setData(null); current.current = null;
    void (async () => {
      if (!validEventId(eventId)) throw new MobileApiError("ไม่พบกิจกรรม", "EVENT_NOT_FOUND", 404);
      const [event, { session, value: membership }] = await Promise.all([getEventDetail(eventId), eventPrivateRequest(s => getEventMember(s.sessionToken))]);
      if (!active.current || request !== epoch.current) return;
      if (!await sameCustomer(session)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่");
      if (!active.current || request !== epoch.current) return;
      const draft = eventDraft(session.identity.accountId, eventId);
      if (!draft.fields.ownerTel && membership.member?.tel) draft.fields.ownerTel = membership.member.tel;
      if (!draft.pending && !draft.receipt) {
        if (event.formKind === "royal" && !event.catalogs.some(c => c.level === draft.fields.level) && event.catalogs[0]) draft.fields.level = event.catalogs[0].level;
        draft.fields = prepareRegistrationFields(event, draft.fields);
      }
      const ready = { session, event, member: membership.member, draft }; current.current = ready; setData(ready);
    })().catch(failure => { if (active.current && request === epoch.current) setError(failure); });
  }, [eventId]);
  useFocusEffect(useCallback(() => { active.current = true; load(); return () => { active.current = false; epoch.current++; current.current = null; }; }, [load]));
  const isCurrent = useCallback(async (d: Ready) => {
    if (!active.current || current.current !== d || !await sameCustomer(d.session)) return false;
    return active.current && current.current === d;
  }, []);
  const managers = useMemo(() => {
    if (!data) return null;
    const d = data;
    const photos = createPhotoManager({ select: selectApplicantPhoto, normalize: normalizeApplicantPhoto, bytes: readApplicantBytes,
      upload: bytes => uploadEventImage(d.session.sessionToken, eventId, bytes), current: () => isCurrent(d),
      changed: slots => { d.draft.photos = slots; d.draft.dirty = true; if (active.current && current.current === d) refreshUI(); } }, d.draft.photos);
    d.draft.photos = photos.slots;
    const submission = createSubmission(async payload => {
      if (!await isCurrent(d)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณากลับไปตรวจสอบบัญชีก่อน");
      const result = await submitEventRegistration(d.session.sessionToken, eventId, payload);
      if (!await isCurrent(d)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณากลับไปตรวจสอบบัญชีก่อน");
      return result;
    }, () => { d.draft.pending = submission.pending; if (active.current && current.current === d) refreshUI(); }, d.draft.pending && { ...d.draft.pending, state: d.draft.pending.state === "sending" ? "uncertain" : d.draft.pending.state });
    const lookup = createBuffaloLookup({ fields: () => d.draft.fields, read: microchip => getRegistrationBuffalo(d.session.sessionToken, microchip), current: () => isCurrent(d),
      apply: fields => { if (d.draft.pending || lock.current) return; d.draft.fields = reconcileClasses(d.event, fields, d.draft.fields); d.draft.dirty = true; refreshUI(); },
      state: (working, message) => { if (active.current && current.current === d) { setLookupBusy(working); if (message !== null) setLookupMessage(message); } } });
    return { photos, submission, lookup };
  }, [data, eventId, isCurrent, refreshUI]);
  const blocked = busy || data?.draft.pending?.state === "uncertain" || data?.draft.pending?.state === "sending";
  const exit = useDraftExit(!!data?.draft.dirty && !data.draft.receipt, blocked, () => { if (data) discardEventDraft(data.session.identity.accountId, eventId); });
  const back = () => router.replace({ pathname: "/events/[eventId]", params: { eventId } });
  const refreshRules = async () => {
    if (!data || lock.current) return;
    try {
      const event = await getEventDetail(eventId);
      if (!await isCurrent(data)) return;
      const changed = JSON.stringify([event.formKind, event.ageCutoffDay, event.catalogs]) !== JSON.stringify([data.event.formKind, data.event.ageCutoffDay, data.event.catalogs]);
      if (changed && (!data.draft.pending || data.draft.pending.state === "rejected")) data.draft.agreements = {};
      if (!data.draft.pending && changed) data.draft.fields = reconcileClasses(event, event.formKind === "normal" ? data.draft.fields : { ...data.draft.fields, classMode: "auto", type: "" });
      data.event = event; setProblem(changed ? "กติกาเปลี่ยนแล้ว กรุณาตรวจสอบรุ่นและอ่านข้อตกลงอีกครั้ง ข้อมูลที่กรอกยังอยู่" : "อัปเดตกติกาล่าสุดแล้ว"); refreshUI();
    } catch (failure) { setProblem(eventAccountError(failure)); }
  };
  const enroll = async () => {
    if (!data || lock.current) return;
    const validated = validateMember(data.draft.member);
    if (!validated.value) { setProblem(validated.error!); return; }
    lock.current = true; setBusy(true); setProblem(null);
    try {
      if (!await isCurrent(data)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาเริ่มใหม่");
      const result = await enrollEventMember(data.session.sessionToken, validated.value);
      if (!await isCurrent(data)) return;
      data.draft.fields.firstName ||= validated.value.firstName;
      data.draft.fields.lastName ||= validated.value.lastName;
      data.draft.fields.ownerTel ||= validated.value.tel;
      data.member = result.member; data.draft.dirty = false;
      router.replace({ pathname: "/events/[eventId]/register", params: { eventId } });
    } catch (failure) {
      setProblem(eventAccountError(failure));
      if (failure instanceof MobileApiError && failure.status === 401 && await isCurrent(data)) { await recoverRejectedMobileSession(failure); setError(failure); }
    }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const submit = async () => {
    if (!data || !managers || lock.current) return;
    managers.lookup.cancel(); lock.current = true; setBusy(true); setProblem(null);
    try {
      if (!managers.submission.pending) {
        const fresh = await getEventDetail(eventId);
        if (!await isCurrent(data)) throw new Error("บัญชีเปลี่ยนแล้ว กรุณาเริ่มใหม่");
        const changed = JSON.stringify([fresh.formKind, fresh.ageCutoffDay, fresh.catalogs]) !== JSON.stringify([data.event.formKind, data.event.ageCutoffDay, data.event.catalogs]);
        if (!data.draft.pending) data.draft.fields = reconcileClasses(fresh, { ...data.draft.fields, ...(changed && fresh.formKind === "royal" ? { classMode: "auto" as const, type: "" } : {}) });
        data.event = fresh;
        if (changed) { data.draft.agreements = {}; throw new Error("กติกาเปลี่ยนแล้ว กรุณาตรวจสอบรุ่นและอ่านข้อตกลงอีกครั้ง ข้อมูลที่กรอกยังอยู่"); }
        if (fresh.policy.publicRegistration !== "open") throw new Error("กิจกรรมนี้ปิดรับสมัครแล้ว ข้อมูลที่กรอกยังอยู่");
      }
      const result = await managers.submission.submit(() => buildRegistrationRequest(data.event, data.draft.fields, data.draft.agreements, data.draft.photos.filter(slot => slot.status === "ready").map(slot => slot.assetId!), randomUUID()));
      if (result && await isCurrent(data)) { data.draft.receipt = result; data.draft.dirty = false; refreshUI(); }
    } catch (failure) {
      if (await isCurrent(data)) {
        setProblem(eventAccountError(failure));
        if (failure instanceof MobileApiError && failure.status === 401) { await recoverRejectedMobileSession(failure); setError(failure); }
        if (failure instanceof MobileApiError && ["REGISTRATION_CLOSED", "EVENT_REVISION_CONFLICT", "INVALID_CLASS"].includes(failure.code)) {
          try {
            const fresh = await getEventDetail(eventId);
            if (!await isCurrent(data)) return;
            if (JSON.stringify([fresh.formKind, fresh.ageCutoffDay, fresh.catalogs]) !== JSON.stringify([data.event.formKind, data.event.ageCutoffDay, data.event.catalogs])) data.draft.agreements = {};
            data.event = fresh;
          } catch { /* Keep entered values and the rejected operation. */ }
        }
      }
    } finally { lock.current = false; if (active.current) { setBusy(false); refreshUI(); } }
  };
  const beginAnother = async () => {
    if (!data || !managers || lock.current || busy || !data.draft.receipt || data.event.formKind !== "normal") return;
    try {
      if (!await isCurrent(data) || lock.current || current.current !== data) return;
      managers.lookup.cancel();
      const draft = beginAnotherNormalRegistration(data.session.identity.accountId, data.event, data.draft);
      const ready = { ...data, draft };
      // Rebind all managers to a fresh Ready object. The old submission closure still owns only its old payload.
      current.current = ready; setData(ready); setProblem(null); setLookupMessage(null); setLookupBusy(false);
    } catch (failure) {
      if (active.current && current.current === data) setProblem(eventAccountError(failure));
    }
  };
  const guardedPhoto = (operation: () => Promise<void>) => { void operation().catch(failure => setProblem(eventAccountError(failure))); };
  const receipt = data?.draft.receipt;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><Screen activeTab="home" showBottomNav={false}>
    <Pressable accessibilityRole="button" onPress={back} style={formStyles.back}><Text style={formStyles.gold}>← รายละเอียดกิจกรรม</Text></Pressable>
    {error ? <CustomerGate error={error} retry={load} eventId={eventId} /> : !data ? <Skeleton variant="card" /> : receipt ? <><RegistrationDetailView registration={receipt.registration} receipt replayed={receipt.replayed} />{problem ? <Text accessibilityRole="alert" style={formStyles.error}>{problem}</Text> : null}<View style={formStyles.actions}>{data.event.formKind === "normal" ? <EventButton label="สมัครควายตัวนี้เพิ่มอีกระดับหรือรุ่นอื่น" disabled={busy} onPress={() => { void beginAnother(); }} /> : null}<EventButton label="ดูประวัติการสมัครของฉัน" onPress={() => router.replace("/registrations")} /></View></> : memberMode && !data.member ? <MemberFormView value={data.draft.member} onChange={value => { data.draft.member = value; data.draft.dirty = true; refreshUI(); }} onSubmit={() => { void enroll(); }} busy={busy} error={problem} /> : memberMode || !data.member ? <StateBlock title={data.member ? "สมาชิกกิจกรรมพร้อมแล้ว" : "สมัครสมาชิกกิจกรรมก่อน"} message="ใช้สมาชิกประกวดชุดเดียวกัน โดยไม่ต้องเชื่อมกระเป๋าเงิน" actionLabel={data.member ? "กรอกใบสมัครประกวด" : "กรอกข้อมูลสมาชิก"} onAction={() => { data.draft.dirty = false; router.replace({ pathname: data.member ? "/events/[eventId]/register" : "/events/[eventId]/member", params: { eventId } }); }} /> : managers ? <RegistrationFormView
      event={data.event} value={data.draft.fields} agreements={data.draft.agreements} photos={data.draft.photos} busy={busy} pending={managers.submission.pending?.state} error={problem}
      onChange={fields => { if (data.draft.pending || lock.current) return; data.draft.fields = reconcileClasses(data.event, fields, data.draft.fields); data.draft.dirty = true; managers.lookup.cancel(); setLookupMessage(null); refreshUI(); }}
      onAgreement={(key, checked) => { if (!data.draft.pending && !lock.current) { data.draft.agreements = { ...data.draft.agreements, [key]: checked }; data.draft.dirty = true; refreshUI(); } }}
      onPhoto={(i, camera) => { if (!data.draft.pending && !lock.current) guardedPhoto(() => managers.photos.choose(i, camera)); }} onRemovePhoto={i => { if (!data.draft.pending && !lock.current) managers.photos.remove(i); }} onRetryPhoto={i => { if (!data.draft.pending && !lock.current) guardedPhoto(() => managers.photos.retry(i)); }}
      onLookup={() => { if (!data.draft.pending && !lock.current) { setLookupMessage(null); void managers.lookup.lookup(); } }} lookupBusy={lookupBusy} lookupMessage={lookupMessage} onSubmit={() => { void submit(); }} onRefresh={() => { void refreshRules(); }} onEditRejected={() => { if (lock.current || managers.submission.pending?.state !== "rejected") return; managers.submission.edit(); data.draft.pending = undefined; data.draft.fields = reconcileClasses(data.event, data.draft.fields); setProblem(null); refreshUI(); }} /> : null}
    <ExitConfirmation {...exit} />
  </Screen></KeyboardAvoidingView>;
}
