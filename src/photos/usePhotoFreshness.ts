import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { getBuffaloPhotos } from "@/api/jaothui";
import { createPhotoCoordinator } from "./coordinator";
import type { PhotoEntry } from "./contract";

/** Opt in only; business resources, certificate generation and Home stats stay untouched. */
export function usePhotoFreshness(entries: readonly PhotoEntry[]) {
  const coordinator = useRef<ReturnType<typeof createPhotoCoordinator> | null>(null);
  if (!coordinator.current) coordinator.current = createPhotoCoordinator(getBuffaloPhotos);
  const current = coordinator.current;
  const snapshot = useSyncExternalStore(current.subscribe, current.getSnapshot, current.getSnapshot);
  const focused = useRef(false);
  const active = useRef(AppState.currentState === "active");
  const [focusVersion, setFocusVersion] = useState(0);
  useEffect(() => { current.seed(entries); }, [current, entries]);
  const trigger = useCallback(() => {
    current.setActive(focused.current && active.current);
    void current.refresh();
  }, [current]);
  useFocusEffect(useCallback(() => {
    focused.current = true; trigger(); setFocusVersion((value) => value + 1);
    return () => { focused.current = false; current.setActive(false); };
  }, [current, trigger]));
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      active.current = state === "active"; trigger();
    });
    return () => listener.remove();
  }, [trigger]);
  // Re-entry is the trigger, not a timer; seeding new metadata already checked its photos.
  useEffect(() => { trigger(); }, [focusVersion, trigger]);
  useEffect(() => () => current.dispose(), [current]);
  const refresh = useCallback(() => { void current.refresh(true); }, [current]);
  return { ...snapshot, refresh };
}
