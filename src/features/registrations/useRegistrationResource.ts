import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { MobileApiError } from "@/api/client";
import { sameCustomer, type CustomerSession } from "./customer";

export type PrivateRegistrationData<T> = { session: CustomerSession; value: T };
type ResourceState<T> = {
  status: "loading" | "success" | "error";
  data: PrivateRegistrationData<T> | null;
  error: Error | null;
  refreshing: boolean;
  updatedAt: string | null;
};
const initial = <T,>(): ResourceState<T> => ({ status: "loading", data: null, error: null, refreshing: false, updatedAt: null });

/** Private, visible-only refresh. No request or private result survives blur/background. */
export function useRegistrationResource<T>(loader: () => Promise<PrivateRegistrationData<T>>, intervalMs: number) {
  const [state, setState] = useState<ResourceState<T>>(initial);
  const current = useRef(state); current.current = state;
  const generation = useRef(0), pending = useRef(false), visible = useRef(false);
  const invalidate = useCallback(() => { generation.current++; pending.current = false; }, []);
  const run = useCallback(async () => {
    if (!visible.current || AppState.currentState !== "active" || pending.current) return;
    const request = ++generation.current; pending.current = true;
    setState(previous => ({ ...previous, refreshing: true }));
    try {
      const next = await loader();
      if (request !== generation.current || !visible.current) return;
      if (!await sameCustomer(next.session)) throw new MobileApiError("บัญชีเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่", "CUSTOMER_REQUIRED", 403);
      if (request !== generation.current || !visible.current) return;
      setState({ status: "success", data: next, error: null, refreshing: false, updatedAt: new Date().toISOString() });
    } catch (cause) {
      if (request !== generation.current || !visible.current) return;
      const previous = current.current.data;
      const keep = previous && !(cause instanceof MobileApiError && [401, 403, 404].includes(cause.status)) && await sameCustomer(previous.session).catch(() => false);
      if (request !== generation.current || !visible.current) return;
      const error = cause instanceof Error ? cause : new Error("โหลดข้อมูลล่าสุดไม่สำเร็จ");
      setState(old => ({ ...old, status: keep ? "success" : "error", data: keep ? old.data : null, updatedAt: keep ? old.updatedAt : null, error, refreshing: false }));
    } finally { if (request === generation.current) pending.current = false; }
  }, [loader]);
  useFocusEffect(useCallback(() => {
    visible.current = true; invalidate(); setState(initial()); void run();
    const subscription = AppState.addEventListener("change", next => {
      invalidate(); setState(initial());
      if (next === "active") void run();
    });
    const timer = setInterval(() => { void run(); }, intervalMs);
    return () => { visible.current = false; invalidate(); clearInterval(timer); subscription.remove(); setState(initial()); };
  }, [invalidate, intervalMs, run]));
  const replace = useCallback((expected: PrivateRegistrationData<T>, value: T) => {
    if (!visible.current || current.current.data !== expected || AppState.currentState !== "active") return false;
    invalidate();
    setState(old => ({ ...old, data: { session: expected.session, value }, error: null, refreshing: false, updatedAt: new Date().toISOString() }));
    return true;
  }, [invalidate]);
  return { ...state, reload: run, replace };
}
