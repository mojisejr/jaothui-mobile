import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { NOTIFICATION_PROJECT_ID } from "./api";

export const nativePushSupported = () => Device.isDevice && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient && (Platform.OS === "android" || Platform.OS === "ios");
export const notificationPlatform = () => Platform.OS as "android" | "ios";
export const readNotificationPermission = async () => (await Notifications.getPermissionsAsync()).status;
export async function requestNotificationPermission() {
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("competition-reminders", {
    name: "การแจ้งเตือนการแข่งขัน", importance: Notifications.AndroidImportance.DEFAULT,
  });
  return (await Notifications.requestPermissionsAsync()).status;
}
export async function readExpoPushToken() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId: NOTIFICATION_PROJECT_ID }).then(result => result.data),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("ยังเชื่อมต่อการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่")), 10000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
export const nativeNotifications = Notifications;
