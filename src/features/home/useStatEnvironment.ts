import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { createMotionPreference } from "./countUp";

export function useStatEnvironment() {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const preference = createMotionPreference(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", preference.event);
    AccessibilityInfo.isReduceMotionEnabled().then(preference.initial, preference.fail);
    return () => { preference.dispose(); listener.remove(); };
  }, []);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (value) => setForeground(value === "active"));
    return () => listener.remove();
  }, []);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  return { reduceMotion, active: focused && foreground };
}
