import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MobileApiError } from "@/api/client";
import { getEventRegistration } from "@/api/events";
import { validEventId } from "@/auth/oauthIntentStorage";
import { Screen } from "@/components/Screen";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { useEventResource } from "@/features/events/useEventResource";
import { eventPrivateRequest } from "./privateRequest";
import { RegistrationDetailView } from "./RegistrationDetailView";
import { CustomerGate } from "./CustomerGate";
import { formStyles } from "./FormControls";
export function RegistrationDetailScreen() {
  const router = useRouter(), params = useLocalSearchParams<{ id: string }>(), id = typeof params.id === "string" ? params.id : "";
  const loader = useCallback(() => eventPrivateRequest(session => {
    if (!validEventId(id)) throw new MobileApiError("ไม่พบใบสมัคร", "REGISTRATION_NOT_FOUND", 404);
    return getEventRegistration(session.sessionToken, id);
  }), [id]), resource = useEventResource(loader);
  return <Screen activeTab="profile"><Pressable accessibilityRole="button" onPress={() => router.replace("/registrations")} style={formStyles.back}><Text style={formStyles.gold}>← ประวัติการสมัคร</Text></Pressable>
    {resource.status === "loading" ? <Skeleton variant="card" /> : resource.status === "error" ? resource.error instanceof MobileApiError && resource.error.status === 404 ? <StateBlock title="ไม่พบใบสมัครนี้" message="ใบสมัครอาจไม่พร้อมใช้งานหรือไม่ได้อยู่ในบัญชีนี้" actionLabel="กลับประวัติการสมัคร" onAction={() => router.replace("/registrations")} /> : <CustomerGate error={resource.error} retry={resource.reload} /> : <RegistrationDetailView registration={resource.data.value} />}
  </Screen>;
}
