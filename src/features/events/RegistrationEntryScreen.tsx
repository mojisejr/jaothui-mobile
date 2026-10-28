import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";

/** Phase3 destination boundary; real enrollment/forms belong to Phase4. */
export function RegistrationEntryScreen({ member = false }: { member?: boolean }) {
  const router = useRouter(), params = useLocalSearchParams<{ eventId: string }>();
  return <Screen activeTab="home"><StateBlock title={member ? "ข้อมูลสมาชิกกิจกรรม" : "ข้อมูลสมัครประกวด"} message="ขั้นตอนกรอกข้อมูลกำลังเตรียมในส่วนถัดไป ยังไม่มีการส่งใบสมัคร" actionLabel="กลับรายละเอียดกิจกรรม" onAction={() => router.replace({ pathname: "/events/[eventId]", params: { eventId: params.eventId } })} /></Screen>;
}
