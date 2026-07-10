import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getProfile } from "@/api/jaothui";
import { openBitkubNextAuthSession } from "@/auth/bitkubNext";
import { clearMobileSession, loadMobileSession } from "@/auth/sessionStorage";
import { AppShell } from "@/components/AppShell";
import { BuffaloCard } from "@/components/BuffaloCard";
import { SettingsRow } from "@/components/SettingsRow";
import { Skeleton } from "@/components/Skeleton";
import { StateBlock } from "@/components/StateBlock";
import { colors, shadow, spacing, typography } from "@/design/tokens";
import type { MobileBitkubNextSession, MobileProfile } from "@/types/mobile-api";
import {
  formatWalletAddress,
  getOwnedBuffaloPreview,
  getProfileContactLabel,
  getProfileDisplayName,
  getProfileStatusLabel,
} from "./profileViewModel";

type ProfileState =
  | { status: "checking" }
  | { status: "disconnected"; message?: string }
  | { status: "connecting" }
  | { status: "loading"; session: MobileBitkubNextSession }
  | { status: "connected"; session: MobileBitkubNextSession; profile: MobileProfile }
  | { status: "error"; message: string; session?: MobileBitkubNextSession };

const logoSource = require("@/assets/images/thuiLogo.png");

export function ProfileShell() {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "checking" });

  const loadProfileFromSession = useCallback(async (session: MobileBitkubNextSession) => {
    setState({ status: "loading", session });
    const profile = await getProfile(session.sessionToken);
    setState({ status: "connected", session, profile });
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

  const connect = useCallback(async () => {
    setState({ status: "connecting" });
    try {
      const result = await openBitkubNextAuthSession();
      if (!result.ok) {
        setState({ status: "disconnected", message: result.message });
        return;
      }
      await loadProfileFromSession(result.session);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "เชื่อมต่อ Bitkub NEXT ไม่สำเร็จ",
      });
    }
  }, [loadProfileFromSession]);

  const logout = useCallback(async () => {
    await clearMobileSession();
    setState({ status: "disconnected" });
  }, []);

  return (
    <AppShell activeTab="profile">
      {state.status === "checking" ? <ProfileSkeleton /> : null}
      {state.status === "disconnected" ? (
        <DisconnectedProfile message={state.message} onConnect={connect} />
      ) : null}
      {state.status === "connecting" ? (
        <StateBlock title="กำลังเปิด Bitkub NEXT" message="ระบบกำลังพาคุณไปยืนยันตัวตนผ่านเบราว์เซอร์" />
      ) : null}
      {state.status === "loading" ? <ProfileSkeleton /> : null}
      {state.status === "error" ? (
        <StateBlock
          title="โหลดโปรไฟล์ไม่สำเร็จ"
          message={state.message}
          actionLabel={state.session ? "ลองใหม่" : "เชื่อมต่อใหม่"}
          onAction={() => (state.session ? loadProfileFromSession(state.session) : connect())}
        />
      ) : null}
      {state.status === "connected" ? (
        <ConnectedProfile
          profile={state.profile}
          onLogout={logout}
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

function DisconnectedProfile({ message, onConnect }: { message?: string; onConnect: () => void }) {
  return (
    <>
      <View style={styles.header}>
        <Image source={logoSource} style={styles.avatarImage} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>โปรไฟล์</Text>
          <Text style={styles.title}>เชื่อมต่อ Bitkub NEXT</Text>
          <Text style={styles.subtitle}>
            เข้าสู่ระบบเพื่อดูข้อมูลสมาชิก ฟาร์ม กระเป๋า และควายของคุณใน JAOTHUI
          </Text>
        </View>
      </View>

      <StateBlock
        title="ยังไม่ได้เชื่อมต่อ"
        message={message || "เชื่อมต่อผ่าน Bitkub NEXT เพื่อโหลดโปรไฟล์เดียวกับหน้าเว็บ JAOTHUI"}
        actionLabel="เชื่อมต่อ Bitkub NEXT"
        onAction={onConnect}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>บัญชีและฟาร์ม</Text>
        <SettingsRow label="ข้อมูลสมาชิก" />
        <SettingsRow label="ข้อมูลฟาร์ม" />
        <SettingsRow label="กระเป๋า Bitkub NEXT" />
      </View>
    </>
  );
}

function ConnectedProfile({
  onLogout,
  onOpenBuffalo,
  profile,
}: {
  onLogout: () => void;
  onOpenBuffalo: (microchip: string) => void;
  profile: MobileProfile;
}) {
  const ownedBuffalos = getOwnedBuffaloPreview(profile);
  const displayName = getProfileDisplayName(profile);
  const statusLabel = getProfileStatusLabel(profile);
  const contactLabel = getProfileContactLabel(profile);
  const avatarUrl = profile.member?.avatarUrl;
  const walletLabel = formatWalletAddress(profile.identity.walletAddress);

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
          <Text style={styles.eyebrow}>Bitkub NEXT</Text>
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
        <SettingsRow disabled={false} label="กระเป๋า Bitkub NEXT" right={walletLabel} />
        <SettingsRow
          disabled={false}
          label="ข้อมูลสมาชิก"
          right={profile.member ? profile.member.role || "สมาชิก" : "ไม่มี member"}
        />
        <SettingsRow disabled={false} label="ข้อมูลฟาร์ม" right={profile.member?.farmName || "ยังไม่มีฟาร์ม"} />
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitleLarge}>ควายของฉัน</Text>
          <Text style={styles.sectionCaption}>{profile.counts.ownedBuffalos} รายการในบัญชีนี้</Text>
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
          message="บัญชีนี้เชื่อมต่อแล้ว แต่ยังไม่มีข้อมูลควายที่ผูกกับโปรไฟล์ JAOTHUI"
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
