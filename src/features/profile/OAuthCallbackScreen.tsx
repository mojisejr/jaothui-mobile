import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import {
  completeBitkubNextHandoff,
  completeBitkubNextWalletLinkHandoff,
} from "@/auth/bitkubNext";
import { oauthCompletion } from "@/auth/oauthCompletion";
import { loadMobileSession } from "@/auth/sessionStorage";

type CallbackState = "redeeming" | "missing" | "failed";

export function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    handoff?: string | string[];
    error?: string | string[];
    provider?: string | string[];
    purpose?: string | string[];
    clientFlowId?: string | string[];
    intentId?: string | string[];
  }>();
  const [state, setState] = useState<CallbackState>("redeeming");
  const [attempt, setAttempt] = useState(0);
  const callbackUrl = (() => {
    const url = new URL("jaothui://oauth/callback");
    for (const key of ["handoff", "error", "provider", "purpose", "clientFlowId", "intentId"] as const) {
      const value = params[key];
      if (typeof value === "string") url.searchParams.set(key, value);
      else if (Array.isArray(value) && value.length === 1) url.searchParams.set(key, value[0]);
    }
    return url.toString();
  })();
  const scalar = (value: string | string[] | undefined) => typeof value === "string" ? value : value?.length === 1 ? value[0] : undefined;
  const handoff = scalar(params.handoff), providerError = scalar(params.error), provider = scalar(params.provider), purpose = scalar(params.purpose);
  const leave = async () => {
    if (provider === "line") router.replace(await oauthCompletion.exit(callbackUrl) as Href);
    else router.replace("/profile");
  };

  useEffect(() => {
    let active = true;
    setState("redeeming");
    // Attach must be dispatched before the legacy LINE login parser. Both
    // native URL routing and openAuthSession use this SAME persisted coordinator.
    if (provider === "line") {
      oauthCompletion.complete(callbackUrl).then(result => { if (active) router.replace(result.target as Href); })
        .catch(() => { if (active) setState("failed"); });
      return () => { active = false; };
    }

    if (providerError || !handoff) {
      setState("missing");
      return;
    }

    const verifiedHandoff = handoff;
    async function completeHandoff() {
      if (provider === "bitkub-next" && purpose === "link") {
        const session = await loadMobileSession();
        if (
          !session ||
          session.identity.sessionVersion !== 2 ||
          (session.identity.provider !== "line" && session.identity.provider !== "apple")
        ) {
          throw new Error("Missing JAOTHUI account session for wallet link");
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
  }, [providerError, handoff, provider, purpose, callbackUrl, router, attempt]);

  if (state === "missing") {
    return (
      <Screen activeTab="profile">
        <StateBlock
          title="เชื่อมต่อไม่สำเร็จ"
          message="ไม่พบข้อมูลยืนยันบัญชี กรุณากลับไปเริ่มเข้าสู่ระบบใหม่"
          actionLabel="กลับโปรไฟล์"
          onAction={() => { void leave(); }}
        />
      </Screen>
    );
  }

  if (state === "failed") {
    return (
      <Screen activeTab="profile">
        <StateBlock
          title="ยืนยันบัญชีไม่สำเร็จ"
          message="ขั้นตอนนี้อาจหมดอายุหรือเครือข่ายยังไม่พร้อม บัญชีเดิมจะไม่ถูกแทนที่โดยข้อมูลที่ไม่ตรงกัน"
          actionLabel="ลองยืนยันอีกครั้ง"
          onAction={() => setAttempt(value => value + 1)}
        />
        <StateBlock title="กลับไปตรวจสอบข้อมูล" actionLabel="กลับหน้าก่อนเข้าสู่ระบบ" onAction={() => { void leave(); }} />
      </Screen>
    );
  }

  return (
    <Screen activeTab="profile">
      <StateBlock title="กำลังเชื่อมต่อบัญชี" message="กำลังยืนยันการเข้าสู่ระบบกับ JAOTHUI" />
    </Screen>
  );
}
