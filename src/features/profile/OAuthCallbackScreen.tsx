import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import {
  completeBitkubNextHandoff,
  completeBitkubNextWalletLinkHandoff,
} from "@/auth/bitkubNext";
import { completeLineAccountHandoff } from "@/auth/lineAccount";
import { loadMobileSession } from "@/auth/sessionStorage";

type CallbackState = "redeeming" | "missing" | "failed";

export function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    handoff?: string | string[];
    error?: string | string[];
    provider?: string | string[];
    purpose?: string | string[];
  }>();
  const [state, setState] = useState<CallbackState>("redeeming");

  useEffect(() => {
    const handoff = Array.isArray(params.handoff) ? params.handoff[0] : params.handoff;
    const providerError = Array.isArray(params.error) ? params.error[0] : params.error;
    const provider = Array.isArray(params.provider) ? params.provider[0] : params.provider;
    const purpose = Array.isArray(params.purpose) ? params.purpose[0] : params.purpose;

    if (providerError || !handoff) {
      setState("missing");
      return;
    }

    const verifiedHandoff = handoff;
    let active = true;
    async function completeHandoff() {
      if (provider === "line") {
        await completeLineAccountHandoff(verifiedHandoff);
        return;
      }

      if (provider === "bitkub-next" && purpose === "link") {
        const session = await loadMobileSession();
        if (!session || session.identity.provider !== "line") {
          throw new Error("Missing LINE account session for wallet link");
        }
        await completeBitkubNextWalletLinkHandoff(verifiedHandoff, session.sessionToken);
        return;
      }

      if (!provider) {
        await completeBitkubNextHandoff(verifiedHandoff);
        return;
      }

      throw new Error("Unsupported OAuth callback provider");
    }

    completeHandoff()
      .then(() => {
        if (active) router.replace("/profile");
      })
      .catch(() => {
        if (active) setState("failed");
      });

    return () => {
      active = false;
    };
  }, [params.error, params.handoff, params.provider, params.purpose, router]);

  if (state === "missing") {
    return (
      <Screen activeTab="profile">
        <StateBlock
          title="เชื่อมต่อไม่สำเร็จ"
          message="ไม่พบ handoff ที่ถูกต้องจากระบบยืนยันตัวตน กรุณากลับไปเริ่มใหม่"
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
      <StateBlock title="กำลังเชื่อมต่อบัญชี" message="กำลังยืนยัน session กับ JAOTHUI" />
    </Screen>
  );
}
