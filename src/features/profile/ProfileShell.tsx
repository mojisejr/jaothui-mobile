import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getProfile } from "@/api/jaothui";
import { isAppleAccountAuthAvailable, openAppleAccountAuthSession } from "@/auth/appleAccount";
import { openBitkubNextWalletLinkSession } from "@/auth/bitkubNext";
import { openLineAccountAuthSession } from "@/auth/lineAccount";
import { clearMobileSession, loadMobileSession } from "@/auth/sessionStorage";
import { AppShell } from "@/components/AppShell";
import { BuffaloCard } from "@/components/BuffaloCard";
import { SettingsRow } from "@/components/SettingsRow";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { colors, shadow, spacing, typography } from "@/design/tokens";
import type { MobileProfile, MobileSession } from "@/types/mobile-api";
import {
  formatWalletAddress,
  getLinkedWallet,
  getOwnedBuffaloPreview,
  getProfileAvatarUrl,
  getProfileContactLabel,
  getProfileDisplayName,
  getProfileStatusLabel,
  getWalletLabel,
  hasLinkedWallet,
} from "./profileViewModel";

type ProfileState =
  | { status: "checking" }
  | { status: "disconnected"; message?: string }
  | { status: "connectingApple" }
  | { status: "connectingLine" }
  | { status: "loading"; session: MobileSession }
  | { status: "connected"; session: MobileSession; profile: MobileProfile }
  | { status: "linkingWallet"; session: MobileSession; profile: MobileProfile }
  | { status: "error"; message: string; session?: MobileSession };

const logoSource = require("@/assets/images/thuiLogo.png");

export function ProfileShell() {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "checking" });
  const [appleAvailable, setAppleAvailable] = useState(false);

  const loadProfileFromSession = useCallback(async (session: MobileSession) => {
    setState({ status: "loading", session });
    try {
      const profile = await getProfile(session.sessionToken);
      setState({ status: "connected", session, profile });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "โหลดโปรไฟล์ไม่สำเร็จ",
        session,
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await loadMobileSession();
      if (!session) {
        setState({ status: "disconnected" });
        return;
      }
      await loadProfileFromSession(session);
    } catch {
      setState({
        status: "disconnected",
        message: "ยังไม่พบ session ที่พร้อมใช้งานบนอุปกรณ์นี้",
      });
    }
  }, [loadProfileFromSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    isAppleAccountAuthAvailable()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch(() => {
        if (active) setAppleAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const connectApple = useCallback(async () => {
    setState({ status: "connectingApple" });
    try {
      const result = await openAppleAccountAuthSession();
      if (!result.ok) {
        setState({ status: "disconnected", message: result.message });
        return;
      }
      await loadProfileFromSession(result.session);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "เข้าสู่ระบบด้วย Apple ไม่สำเร็จ",
      });
    }
  }, [loadProfileFromSession]);

  const connectLine = useCallback(async () => {
    setState({ status: "connectingLine" });
    try {
      const result = await openLineAccountAuthSession();
      if (!result.ok) {
        setState({ status: "disconnected", message: result.message });
        return;
      }
      await loadProfileFromSession(result.session);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ",
      });
    }
  }, [loadProfileFromSession]);

  const linkWallet = useCallback(
    async (session: MobileSession, profile: MobileProfile) => {
      setState({ status: "linkingWallet", session, profile });
      try {
        const result = await openBitkubNextWalletLinkSession();
        if (!result.ok) {
          setState({
            status: "error",
            message: result.message,
            session,
          });
          return;
        }
        await loadProfileFromSession(result.session);
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "ผูก Bitkub NEXT ไม่สำเร็จ",
          session,
        });
      }
    },
    [loadProfileFromSession]
  );

  const logout = useCallback(async () => {
    await clearMobileSession();
    setState({ status: "disconnected" });
  }, []);

  return (
    <AppShell activeTab="profile">
      {state.status === "checking" ? <ProfileSkeleton /> : null}
      {state.status === "disconnected" ? (
        <DisconnectedProfile
          appleAvailable={appleAvailable}
          message={state.message}
          onConnectApple={connectApple}
          onConnectLine={connectLine}
        />
      ) : null}
      {state.status === "connectingApple" ? (
        <StateBlock title="กำลังเปิด Sign in with Apple" message="ระบบกำลังพาคุณไปยืนยันบัญชีด้วย Apple" />
      ) : null}
      {state.status === "connectingLine" ? (
        <StateBlock title="กำลังเปิด LINE Login" message="ระบบกำลังพาคุณไปยืนยันบัญชีผ่านเบราว์เซอร์" />
      ) : null}
      {state.status === "loading" ? <ProfileSkeleton /> : null}
      {state.status === "linkingWallet" ? (
        <StateBlock title="กำลังผูก Bitkub NEXT" message="กำลังยืนยัน wallet และกลับมาอัปเดตโปรไฟล์" />
      ) : null}
      {state.status === "error" ? (
        <StateBlock
          title="โหลดโปรไฟล์ไม่สำเร็จ"
          message={state.message}
          actionLabel={state.session ? "ลองใหม่" : "เข้าสู่ระบบ"}
          onAction={() => (state.session ? loadProfileFromSession(state.session) : appleAvailable ? connectApple() : connectLine())}
        />
      ) : null}
      {state.status === "connected" ? (
        <ConnectedProfile
          profile={state.profile}
          onLogout={logout}
          onLinkWallet={() => linkWallet(state.session, state.profile)}
          onOpenBuffalo={(microchip) =>
            router.push({
              pathname: "/certs/[microchip]",
              params: { microchip },
            })
          }
        />
      ) : null}
    </AppShell>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <View style={styles.header}>
        <Skeleton style={styles.avatarSkeleton} />
        <View style={styles.headerText}>
          <Skeleton style={styles.skeletonEyebrow} />
          <Skeleton style={styles.skeletonTitle} />
          <Skeleton style={styles.skeletonSubtitle} />
        </View>
      </View>
      <View style={styles.card}>
        <Skeleton style={styles.cardSkeletonTitle} />
        <Skeleton style={styles.rowSkeleton} />
        <Skeleton style={styles.rowSkeleton} />
      </View>
    </>
  );
}

function DisconnectedProfile({
  appleAvailable,
  message,
  onConnectApple,
  onConnectLine,
}: {
  appleAvailable: boolean;
  message?: string;
  onConnectApple: () => void;
  onConnectLine: () => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <Image source={logoSource} style={styles.avatarImage} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>โปรไฟล์</Text>
          <Text style={styles.title}>เข้าสู่ระบบ JAOTHUI</Text>
          <Text style={styles.subtitle}>
            เลือก Apple หรือ LINE เพื่อใช้งานโปรไฟล์ แล้วผูก Bitkub NEXT เมื่อพร้อมดูข้อมูลสมาชิก ฟาร์ม และควาย
          </Text>
        </View>
      </View>

      <StateBlock
        title="ยังไม่ได้เข้าสู่ระบบ"
        message={message || "เข้าสู่ระบบเพื่อใช้งานโปรไฟล์ JAOTHUI บนมือถือ"}
      />

      <View style={styles.authActions}>
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            cornerRadius={12}
            onPress={onConnectApple}
            style={styles.appleButton}
          />
        ) : null}
        <Pressable style={styles.lineButton} onPress={onConnectLine}>
          <Text style={styles.lineButtonText}>เข้าสู่ระบบด้วย LINE</Text>
        </Pressable>
        <Text style={styles.authHint}>Bitkub NEXT ใช้สำหรับผูก wallet หลังเข้าสู่ระบบ</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>บัญชีและฟาร์ม</Text>
        {appleAvailable ? <SettingsRow label="บัญชี Apple" /> : null}
        <SettingsRow label="บัญชี LINE" />
        <SettingsRow label="ข้อมูลสมาชิก" />
        <SettingsRow label="ข้อมูลฟาร์ม" />
        <SettingsRow label="กระเป๋า Bitkub NEXT" />
      </View>
    </>
  );
}

function ConnectedProfile({
  onLogout,
  onLinkWallet,
  onOpenBuffalo,
  profile,
}: {
  onLogout: () => void;
  onLinkWallet: () => void;
  onOpenBuffalo: (microchip: string) => void;
  profile: MobileProfile;
}) {
  const ownedBuffalos = getOwnedBuffaloPreview(profile);
  const displayName = getProfileDisplayName(profile);
  const statusLabel = getProfileStatusLabel(profile);
  const contactLabel = getProfileContactLabel(profile);
  const avatarUrl = getProfileAvatarUrl(profile);
  const linkedWallet = getLinkedWallet(profile);
  const walletLabel = getWalletLabel(profile);
  const isJaothuiAccount =
    profile.identity.provider === "line" || profile.identity.provider === "apple";
  const providerLabel =
    profile.identity.provider === "apple"
      ? "Apple Account"
      : profile.identity.provider === "line"
        ? "LINE Account"
        : "Bitkub NEXT";
  const walletLinked = hasLinkedWallet(profile);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarPhoto} resizeMode="cover" />
          ) : (
            <Image source={logoSource} style={styles.avatarImage} resizeMode="contain" />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{providerLabel}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {contactLabel}
          </Text>
        </View>
      </View>

      <View style={styles.statusStrip}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>บัญชีและฟาร์ม</Text>
        {profile.identity.provider === "apple" ? (
          <SettingsRow disabled={false} label="บัญชี Apple" right="เข้าสู่ระบบแล้ว" />
        ) : null}
        {profile.identity.provider === "line" ? (
          <SettingsRow disabled={false} label="บัญชี LINE" right="เข้าสู่ระบบแล้ว" />
        ) : null}
        <SettingsRow disabled={false} label="กระเป๋า Bitkub NEXT" right={walletLabel} />
        <SettingsRow
          disabled={false}
          label="ข้อมูลสมาชิก"
          right={profile.member ? profile.member.role || "สมาชิก" : "ไม่มี member"}
        />
        <SettingsRow disabled={false} label="ข้อมูลฟาร์ม" right={profile.member?.farmName || "ยังไม่มีฟาร์ม"} />
      </View>

      {isJaothuiAccount && !walletLinked ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bitkub NEXT</Text>
          <Text style={styles.panelMessage}>
            บัญชี JAOTHUI พร้อมใช้งานแล้ว หากมี wallet ให้ผูก Bitkub NEXT เพื่อโหลดข้อมูลสมาชิก ฟาร์ม และควายที่ถืออยู่
          </Text>
          <Pressable style={styles.linkButton} onPress={onLinkWallet}>
            <Text style={styles.linkText}>ผูก Bitkub NEXT</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitleLarge}>ควายของฉัน</Text>
          <Text style={styles.sectionCaption}>
            {profile.counts.ownedBuffalos} รายการในบัญชีนี้
            {linkedWallet ? ` · ${formatWalletAddress(linkedWallet.walletAddress)}` : ""}
          </Text>
        </View>
      </View>

      {ownedBuffalos.length > 0 ? (
        <View style={styles.buffaloGrid}>
          {ownedBuffalos.map((buffalo) => (
            <BuffaloCard key={buffalo.microchip} buffalo={buffalo} onPress={() => onOpenBuffalo(buffalo.microchip)} />
          ))}
        </View>
      ) : (
        <StateBlock
          title="ยังไม่พบควายในบัญชีนี้"
          message={
            walletLinked
              ? "บัญชีนี้เชื่อมต่อแล้ว แต่ยังไม่มีข้อมูลควายที่ผูกกับโปรไฟล์ JAOTHUI"
              : "บัญชี JAOTHUI นี้ยังไม่ได้ผูก Bitkub NEXT จึงยังไม่แสดงข้อมูลควายจาก wallet"
          }
        />
      )}

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    padding: spacing.md,
    ...shadow.gold,
  },
  avatarImage: {
    height: 56,
    width: 56,
  },
  avatarPhoto: {
    height: "100%",
    width: "100%",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  avatarText: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: "900",
  },
  avatarSkeleton: {
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  skeletonEyebrow: {
    height: 12,
    width: 96,
  },
  skeletonTitle: {
    height: 24,
    marginTop: 8,
    width: "72%",
  },
  skeletonSubtitle: {
    height: 16,
    marginTop: 10,
    width: "92%",
  },
  statusStrip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: "rgba(63, 166, 106, 0.32)",
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusDot: {
    backgroundColor: colors.success,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
  },
  authActions: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  appleButton: {
    height: 48,
    width: "100%",
  },
  lineButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  lineButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "900",
  },
  authHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  card: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.xl,
  },
  sectionTitleLarge: {
    color: colors.foreground,
    ...typography.sectionTitle,
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  buffaloGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.xl,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  logoutText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  panelMessage: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  linkButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  linkText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "900",
  },
  cardSkeletonTitle: {
    height: 16,
    margin: spacing.md,
    width: 130,
  },
  rowSkeleton: {
    height: 52,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
});
