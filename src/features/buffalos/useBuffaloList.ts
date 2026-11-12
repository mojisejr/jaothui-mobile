import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { getBuffalos } from "@/api/jaothui";
import type { MobileBuffaloList, MobileBuffaloQuery } from "@/types/mobile-api";

const REQUEST_TIMEOUT_MS = 20_000;
type Result = {
  status: "loading" | "success" | "error";
  data: MobileBuffaloList | null;
};

// Keep the last complete page together with its counts while a new public search runs.
export function useBuffaloList(query: MobileBuffaloQuery, waitingForTyping: boolean) {
  const [result, setResult] = useState<Result>({ status: "loading", data: null });
  const focused = useIsFocused();
  const lastSuccess = useRef<{ query: MobileBuffaloQuery; attempt: number } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!focused) return;
    if (!waitingForTyping && lastSuccess.current?.query === query && lastSuccess.current.attempt === attempt) {
      setResult(previous => previous.status === "success" ? previous : { ...previous, status: "success" });
      return;
    }
    setResult(previous => previous.status === "loading" ? previous : { ...previous, status: "loading" });
    if (waitingForTyping) return;
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      controller.abort();
      setResult(previous => ({ ...previous, status: "error" }));
    }, REQUEST_TIMEOUT_MS);

    getBuffalos(query, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        lastSuccess.current = { query, attempt };
        setResult({ status: "success", data });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setResult(previous => ({ ...previous, status: "error" }));
    }).finally(() => clearTimeout(deadline));

    return () => {
      clearTimeout(deadline);
      controller.abort();
    };
  }, [query, waitingForTyping, attempt, focused]);

  return { ...result, reload: () => setAttempt(previous => previous + 1) };
}
