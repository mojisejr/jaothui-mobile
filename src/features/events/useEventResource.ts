import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import type { AsyncState } from "@/hooks/useAsyncResource";
import { createLatestRequestGate } from "./model";

export function useEventResource<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null, error: null });
  const gate = useRef(createLatestRequestGate()).current;
  const controller = useRef<AbortController | null>(null);
  const run = useCallback(() => {
    controller.current?.abort();
    const request = gate.start(), next = new AbortController(); controller.current = next;
    setState({ status: "loading", data: null, error: null });
    loader(next.signal).then(data => { if (gate.current(request)) setState({ status: "success", data, error: null }); })
      .catch(error => { if (gate.current(request)) setState({ status: "error", data: null, error: error instanceof Error ? error : new Error("โหลดข้อมูลไม่สำเร็จ") }); });
  }, [gate, loader]);
  useFocusEffect(useCallback(() => { run(); return () => { gate.invalidate(); controller.current?.abort(); }; }, [gate, run]));
  return { ...state, reload: run };
}
