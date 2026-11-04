import { useEffect } from "react";
import { AppState } from "react-native";
import { useRootNavigationState, useRouter, type Href } from "expo-router";
import type { NotificationResponse } from "expo-notifications";
import { loadMobileSession } from "@/auth/sessionStorage";
import { readBinding } from "./storage";
import { flushNotificationRevocations } from "./lifecycle";
import { nativeNotifications, nativePushSupported } from "./native";
import { notificationService } from "./service";
import { historyHref, parseReminderData, rememberHistoryIntent } from "./historyIntent";

export function NotificationRuntime() {
  const router = useRouter();
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (!navigation?.key || !nativePushSupported()) return;
    let active = true;
    let lastResponse = "";
    // Visible notification handled once by the OS, not a second local schedule.
    nativeNotifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
    const respond = async (response: NotificationResponse) => {
      const key = response.notification.request.identifier;
      if (key === lastResponse) return;
      const parsed = parseReminderData(response.notification.request.content.data);
      if (!parsed) return;
      lastResponse = key;
      const binding = await readBinding();
      await rememberHistoryIntent(parsed.eventId, binding?.accountId ?? null);
      if (!active) return;
      await nativeNotifications.clearLastNotificationResponseAsync();
      router.push(historyHref(parsed.eventId) as Href);
    };
    const refresh = async () => {
      await flushNotificationRevocations();
      const session = await loadMobileSession();
      if (session && active) await notificationService.refresh(session);
    };
    const responseListener = nativeNotifications.addNotificationResponseReceivedListener(response => { void respond(response).catch(() => undefined); });
    const tokenListener = nativeNotifications.addPushTokenListener(() => { void refresh().catch(() => undefined); });
    const appListener = AppState.addEventListener("change", state => { if (state === "active") void refresh().catch(() => undefined); });
    void nativeNotifications.getLastNotificationResponseAsync().then(response => { if (response) return respond(response); }).catch(() => undefined);
    void refresh().catch(() => undefined);
    return () => { active = false; responseListener.remove(); tokenListener.remove(); appListener.remove(); };
  }, [router, navigation?.key]);
  return null;
}
