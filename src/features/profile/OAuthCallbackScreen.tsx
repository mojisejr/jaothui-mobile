import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { completeBitkubNextHandoff } from "@/auth/bitkubNext";

type CallbackState = "redeeming" | "missing" | "failed";

export function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ handoff?: string | string[]; error?: string | string[] }>();
  const [state, setState] = useState<CallbackState>("redeeming");

  useEffect(() => {
    const handoff = Array.isArray(params.handoff) ? params.handoff[0] : params.handoff;
    const providerError = Array.isArray(params.error) ? params.error[0] : params.error;

    if (providerError || !handoff) {
      setState("missing");
      return;
    }

    let active = true;
    completeBitkubNextHandoff(handoff)
      .then(() => {
        if (active) router.replace("/profile");
      })
      .catch(() => {
        if (active) setState("failed");
      });

    return () => {
      active = false;
    };
  }, [params.error, params.handoff, router]);

  if (state === "missing") {
    return (
      <Screen activeTab="profile">
        <StateBlock
          title="เชื่อมต่อไม่สำเร็จ"
          message="ไม่พบ handoff จาก Bitkub NEXT กรุณากลับไปเริ่มเชื่อมต่อใหม่"
          actionLabel="กลับโปรไฟล์"
          onAction={() => router.replace("/profile")}
        />
      </Screen>
    );
  }

  if (state === "failed") {
    return (
      <Screen activeTab="profile">
        <StateBlock
          title="บันทึก session ไม่สำเร็จ"
          message="แอปไม่สามารถแลก handoff เป็น JAOTHUI session ได้ กรุณาลองใหม่อีกครั้ง"
          actionLabel="กลับโปรไฟล์"
          onAction={() => router.replace("/profile")}
        />
      </Screen>
    );
  }

  return (
    <Screen activeTab="profile">
      <StateBlock title="กำลังเชื่อมต่อ Bitkub NEXT" message="กำลังยืนยัน session กับ JAOTHUI" />
    </Screen>
  );
}
