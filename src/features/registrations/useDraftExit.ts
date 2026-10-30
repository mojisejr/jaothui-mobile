import { useEffect, useState } from "react";
import { useNavigation, usePreventRemove, type NavigationAction } from "@react-navigation/native";
import { Platform } from "react-native";
export function useDraftExit(dirty: boolean, blocked: boolean, discard: () => void) {
  const navigation = useNavigation(), [action, setAction] = useState<NavigationAction | null>(null), [allowed, setAllowed] = useState(false);
  usePreventRemove(dirty && !allowed, event => setAction(event.data.action));
  useEffect(() => {
    if (allowed && action) { navigation.dispatch(action); setAction(null); }
  }, [action, allowed, navigation]);
  useEffect(() => {
    if (Platform.OS !== "web" || !dirty) return;
    const confirm = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", confirm);
    return () => window.removeEventListener("beforeunload", confirm);
  }, [dirty]);
  return { visible: action !== null, blocked, onStay: () => setAction(null), onDiscard: () => { if (!blocked) discard(); setAllowed(true); } };
}
