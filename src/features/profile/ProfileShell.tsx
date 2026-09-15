import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getProfile } from "@/api/jaothui";
import { API_BASE_URL } from "@/api/client";
import { isAppleAccountAuthAvailable, openAppleAccountAuthSession } from "@/auth/appleAccount";
import { openBitkubNextWalletLinkSession } from "@/auth/bitkubNext";
import { openLineAccountAuthSession } from "@/auth/lineAccount";
import {
  completeReviewerSandboxSignIn,
  getReviewerSandboxAvailability,
  updateReviewerWalletFixture,
} from "@/auth/reviewerSandbox";
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
  canOpenBitkubNextWalletLink,
  getLinkedWallet,
  getOwnedBuffaloPreview,
  getProfileAvatarUrl,
  getProfileContactLabel,
  getProfileDisplayName,
  getProfileStatusLabel,
  getWalletLabel,
  hasLinkedWallet,
} from "./profileViewModel";
import { deleteAccountThenClearSession } from "./accountDeletion";
import { recoverRejectedMobileSession } from "./sessionRecovery";

type ProfileState =
  | { status: "checking" }
  | { status: "disconnected"; message?: string; appleDeletionGuidance?: boolean }
  | { status: "reviewerAccess" }
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
  const [reviewerAvailable, setReviewerAvailable] = useState(false);
  const [reviewerFixtureLinked, setReviewerFixtureLinked] = useState(false);
  const [reviewerFixtureBusy, setReviewerFixtureBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfileFromSession = useCallback(async (session: MobileSession) => {
    setState({ status: "loading", session });
    try {
      const profile = await getProfile(session.sessionToken);
      setState({ status: "connected", session, profile });
    } catch (error) {
      if (await recoverRejectedMobileSession(error)) {
        setState({
          status: "disconnected",
          message: "เซสชันหมดอายุแล้ว โปรดเข้าสู่ระบบอีกครั้ง",
        });
        return;
      }

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

  useEffect(() => {
    let active = true;
    getReviewerSandboxAvailability()
      .then(({ available }) => {
        if (active) setReviewerAvailable(available);
      })
      .catch(() => {
        // Fail closed: store-review access is hidden unless the server gate confirms it.
        if (active) setReviewerAvailable(false);
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

  const attachAppleToCurrentAccount = useCallback(
    async (session: MobileSession, profile: MobileProfile) => {
      setState({ status: "connectingApple" });
      try {
        const result = await openAppleAccountAuthSession({ attachToCurrentAccount: true });
        if (!result.ok) {
          setState({ status: "connected", session, profile });
          return;
        }
        await loadProfileFromSession(result.session);
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "เชื่อมต่อ Apple กับบัญชีนี้ไม่สำเร็จ",
          session,
        });
      }
    },
    [loadProfileFromSession]
  );

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

  const connectReviewer = useCallback(
    async (username: string, password: string) => {
      const session = await completeReviewerSandboxSignIn({ username, password });
      setReviewerFixtureLinked(false);
      await loadProfileFromSession(session);
    },
    [loadProfileFromSession]
  );

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
    setReviewerFixtureLinked(false);
    setState({ status: "disconnected" });
  }, []);

  const setReviewerFixture = useCallback(
    async (session: MobileSession, linked: boolean) => {
      if (session.identity.provider !== "reviewer" || reviewerFixtureBusy) return;

      setReviewerFixtureBusy(true);
      try {
        const fixture = await updateReviewerWalletFixture(session.sessionToken, linked);
        setReviewerFixtureLinked(fixture.linked);
      } catch (error) {
        Alert.alert(
          "อัปเดต wallet fixture ไม่สำเร็จ",
          error instanceof Error ? error.message : "โปรดลองอีกครั้ง"
        );
      } finally {
        setReviewerFixtureBusy(false);
      }
    },
    [reviewerFixtureBusy]
  );

  const deleteAccount = useCallback(async (session: MobileSession, profile: MobileProfile) => {
    if (
      deleting ||
      (profile.identity.provider !== "line" &&
        profile.identity.provider !== "apple" &&
        profile.identity.provider !== "reviewer")
    ) {
      return;
    }

    setDeleting(true);
    try {
      const { receipt } = await deleteAccountThenClearSession(session.sessionToken);
      setState({
        status: "disconnected",
        message: "ลบบัญชี JAOTHUI สำเร็จแล้ว",
        appleDeletionGuidance: receipt.manualAppleRevocationRequired,
      });
    } catch (error) {
      setState({
        status: "connected",
        session,
        profile,
      });
      Alert.alert(
        "ยังลบบัญชีไม่สำเร็จ",
        error instanceof Error ? error.message : "โปรดลองอีกครั้ง โดยบัญชีของคุณยังเชื่อมต่ออยู่"
      );
    } finally {
      setDeleting(false);
    }
  }, [deleting]);

  const requestAccountDeletion = useCallback(
    (session: MobileSession, profile: MobileProfile) => {
      if (deleting) return;

      Alert.alert(
        "ลบบัญชี JAOTHUI",
        "การลบบัญชีเป็นการถาวร ข้อมูลเข้าสู่ระบบและการเชื่อมต่อ Bitkub NEXT ของบัญชีนี้จะถูกลบ",
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ดำเนินการต่อ",
            style: "destructive",
            onPress: () =>
              Alert.alert(
                "ยืนยันการลบบัญชี",
                "เมื่อลบแล้ว คุณจะไม่สามารถกู้คืนบัญชีหรือการเชื่อมต่อ wallet เดิมได้",
                [
                  { text: "ยกเลิก", style: "cancel" },
                  {
                    text: "ลบบัญชีถาวร",
                    style: "destructive",
                    onPress: () => {
                      void deleteAccount(session, profile);
                    },
                  },
                ]
              ),
          },
        ]
      );
    },
    [deleteAccount, deleting]
  );

  return (
    <AppShell activeTab="profile">
      {state.status === "checking" ? <ProfileSkeleton /> : null}
      {state.status === "disconnected" ? (
        <DisconnectedProfile
          appleAvailable={appleAvailable}
          appleDeletionGuidance={state.appleDeletionGuidance}
          message={state.message}
          onConnectApple={connectApple}
          onConnectLine={connectLine}
          reviewerAvailable={reviewerAvailable}
          onOpenReviewerAccess={() => setState({ status: "reviewerAccess" })}
        />
      ) : null}
      {state.status === "reviewerAccess" ? (
        <ReviewerAccessProfile
          onBack={() => setState({ status: "disconnected" })}
          onSubmit={connectReviewer}
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
          appleAvailable={appleAvailable}
          profile={state.profile}
          onLogout={logout}
          onLinkWallet={() => linkWallet(state.session, state.profile)}
          onToggleReviewerFixture={(linked) => setReviewerFixture(state.session, linked)}
          reviewerFixtureBusy={reviewerFixtureBusy}
          reviewerFixtureLinked={reviewerFixtureLinked}
          onAttachApple={() => attachAppleToCurrentAccount(state.session, state.profile)}
          onDeleteAccount={() => requestAccountDeletion(state.session, state.profile)}
          deleting={deleting}
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
  appleDeletionGuidance,
  message,
  onConnectApple,
  onConnectLine,
  onOpenReviewerAccess,
  reviewerAvailable,
}: {
  appleAvailable: boolean;
  appleDeletionGuidance?: boolean;
  message?: string;
  onConnectApple: () => void;
  onConnectLine: () => void;
  onOpenReviewerAccess: () => void;
  reviewerAvailable: boolean;
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

      {__DEV__ ? (
        <View style={styles.localE2eIndicator} testID="local-e2e-api-indicator">
          <Text style={styles.localE2eIndicatorLabel}>Development API</Text>
          <Text selectable style={styles.localE2eIndicatorValue}>
            {API_BASE_URL}
          </Text>
        </View>
      ) : null}

      {appleDeletionGuidance ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>จัดการการลงชื่อเข้าใช้ด้วย Apple</Text>
          <Text style={styles.panelMessage}>
            JAOTHUI ลบบัญชีของคุณแล้ว หากต้องการจัดการการอนุญาต Sign in with Apple เพิ่มเติม ให้ไปที่ การตั้งค่า &gt; ชื่อของคุณ &gt; Sign in with Apple
          </Text>
          <Pressable
            accessibilityHint="เปิดหน้าช่วยเหลือ Apple เกี่ยวกับการจัดการ Sign in with Apple"
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://support.apple.com/102571")}
            style={styles.appleHelpButton}
          >
            <Text style={styles.appleHelpText}>ดูวิธีจัดการใน Apple</Text>
          </Pressable>
        </View>
      ) : null}

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

      {reviewerAvailable ? (
        <View style={styles.reviewerEntryCard}>
          <View style={styles.reviewerEntryCopy}>
            <Text style={styles.reviewerEntryTitle}>Reviewer access</Text>
            <Text style={styles.reviewerEntryMessage}>
              สำหรับผู้ตรวจสอบ App Store และ Google Play เท่านั้น
            </Text>
          </View>
          <Pressable
            accessibilityHint="เปิดหน้าลงชื่อเข้าใช้สำหรับผู้ตรวจสอบแอป"
            accessibilityLabel="Reviewer access"
            accessibilityRole="button"
            onPress={onOpenReviewerAccess}
            style={styles.reviewerEntryButton}
            testID="reviewer-access-entry"
          >
            <Text style={styles.reviewerEntryButtonText}>เข้าสู่ระบบ</Text>
          </Pressable>
        </View>
      ) : null}

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

function ReviewerAccessProfile({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!username.trim() || !password) {
      setErrorMessage("กรอกชื่อผู้ใช้และรหัสผ่านที่ได้รับสำหรับการตรวจสอบ");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit(username, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ไม่สามารถเข้าสู่ระบบ reviewer ได้");
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, password, username]);

  return (
    <View style={styles.reviewerLoginCard}>
      <Text style={styles.eyebrow}>Reviewer access</Text>
      <Text style={styles.title}>เข้าสู่ระบบสำหรับผู้ตรวจสอบ</Text>
      <Text style={styles.reviewerLoginMessage}>
        ใช้ข้อมูลสำหรับการตรวจสอบที่ให้ไว้ใน App Store Connect หรือ Google Play Console เท่านั้น
      </Text>
      <Text style={styles.inputLabel}>Username</Text>
      <TextInput
        accessibilityLabel="Reviewer username"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
        onChangeText={setUsername}
        placeholder="Username"
        placeholderTextColor={colors.muted}
        style={styles.reviewerInput}
        testID="reviewer-username-input"
        value={username}
      />
      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        accessibilityLabel="Reviewer password"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.reviewerInput}
        testID="reviewer-password-input"
        value={password}
      />
      {errorMessage ? <Text style={styles.reviewerError}>{errorMessage}</Text> : null}
      <Pressable
        accessibilityHint="ส่งข้อมูลไปยัง reviewer sandbox ของ JAOTHUI"
        accessibilityLabel="Sign in to reviewer sandbox"
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => void submit()}
        style={[styles.linkButton, submitting && styles.disabledAction]}
        testID="reviewer-sign-in"
      >
        <Text style={styles.linkText}>{submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ reviewer"}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.reviewerBackButton}
        testID="reviewer-access-back"
      >
        <Text style={styles.reviewerBackText}>กลับไปหน้าโปรไฟล์</Text>
      </Pressable>
    </View>
  );
}

function ConnectedProfile({
  appleAvailable,
  deleting,
  onAttachApple,
  onDeleteAccount,
  onLogout,
  onLinkWallet,
  onOpenBuffalo,
  onToggleReviewerFixture,
  profile,
  reviewerFixtureBusy,
  reviewerFixtureLinked,
}: {
  appleAvailable: boolean;
  deleting: boolean;
  onAttachApple: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  onLinkWallet: () => void;
  onOpenBuffalo: (microchip: string) => void;
  onToggleReviewerFixture: (linked: boolean) => void;
  profile: MobileProfile;
  reviewerFixtureBusy: boolean;
  reviewerFixtureLinked: boolean;
}) {
  const ownedBuffalos = getOwnedBuffaloPreview(profile);
  const displayName = getProfileDisplayName(profile);
  const statusLabel = getProfileStatusLabel(profile);
  const contactLabel = getProfileContactLabel(profile);
  const avatarUrl = getProfileAvatarUrl(profile);
  const linkedWallet = getLinkedWallet(profile);
  const walletLabel = getWalletLabel(profile);
  const isJaothuiAccount =
    profile.identity.provider === "line" ||
    profile.identity.provider === "apple" ||
    profile.identity.provider === "reviewer";
  const isReviewer = profile.identity.provider === "reviewer";
  const providerLabel =
    profile.identity.provider === "apple"
      ? "Apple Account"
      : profile.identity.provider === "line"
        ? "LINE Account"
        : profile.identity.provider === "reviewer"
          ? "Reviewer Sandbox"
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
        {isReviewer ? (
          <SettingsRow disabled={false} label="Demo wallet fixture" right="ไม่ใช่ wallet จริง" />
        ) : (
          <>
            <SettingsRow disabled={false} label="กระเป๋า Bitkub NEXT" right={walletLabel} />
            <SettingsRow
              disabled={false}
              label="ข้อมูลสมาชิก"
              right={profile.member ? profile.member.role || "สมาชิก" : "ไม่มี member"}
            />
            <SettingsRow disabled={false} label="ข้อมูลฟาร์ม" right={profile.member?.farmName || "ยังไม่มีฟาร์ม"} />
          </>
        )}
      </View>

      {isReviewer ? (
        <View style={styles.reviewerFixtureCard}>
          <Text style={styles.reviewerFixtureEyebrow}>REVIEWER SANDBOX</Text>
          <Text style={styles.sectionTitleLarge}>Demo wallet fixture</Text>
          <Text style={styles.reviewerFixtureMessage}>
            นี่คือสถานะจำลองสำหรับตรวจสอบหน้าจอเท่านั้น ไม่ใช่ Bitkub NEXT, ไม่มีสินทรัพย์ และไม่เชื่อมต่อข้อมูลลูกค้าจริง
          </Text>
          <View style={styles.reviewerFixtureStatus}>
            <Text style={styles.reviewerFixtureStatusText}>
              {reviewerFixtureLinked ? "Fixture เชื่อมต่อแล้ว" : "Fixture ยังไม่ได้เชื่อมต่อ"}
            </Text>
          </View>
          <Pressable
            accessibilityHint="สลับสถานะ Demo wallet fixture โดยไม่เปิด Bitkub NEXT"
            accessibilityLabel={reviewerFixtureLinked ? "Unlink demo wallet fixture" : "Link demo wallet fixture"}
            accessibilityRole="button"
            disabled={reviewerFixtureBusy}
            onPress={() => onToggleReviewerFixture(!reviewerFixtureLinked)}
            style={[styles.linkButton, reviewerFixtureBusy && styles.disabledAction]}
            testID="reviewer-wallet-fixture-toggle"
          >
            <Text style={styles.linkText}>
              {reviewerFixtureBusy
                ? "กำลังอัปเดต..."
                : reviewerFixtureLinked
                  ? "ยกเลิกการเชื่อม Demo wallet"
                  : "เชื่อม Demo wallet"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isJaothuiAccount ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>บัญชีและความเป็นส่วนตัว</Text>
          <Text style={styles.panelMessage}>
            {isReviewer
              ? "การลบบัญชี sandbox เป็นการถาวร บัญชีตรวจสอบนี้จะถูกลบโดยไม่กระทบข้อมูลลูกค้าหรือ wallet จริง"
              : "การลบบัญชีเป็นการถาวร และจะลบข้อมูลเข้าสู่ระบบกับการเชื่อมต่อ Bitkub NEXT ของบัญชีนี้"}
          </Text>
          <SettingsRow
            accessibilityHint="เปิดขั้นตอนยืนยันการลบบัญชีแบบถาวร"
            disabledCaption={null}
            disabled={deleting}
            label="ลบบัญชี JAOTHUI"
            onPress={onDeleteAccount}
            right={deleting ? "กำลังลบ..." : "ลบบัญชี"}
            testID="account-deletion-row"
            variant="danger"
          />
        </View>
      ) : null}

      {profile.identity.provider === "line" && appleAvailable ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>เชื่อมต่อบัญชี</Text>
          <Text style={styles.panelMessage}>
            เชื่อมต่อ Apple กับบัญชี LINE นี้เพื่อให้เข้าได้ทั้งสองวิธีและเห็น wallet เดียวกัน
          </Text>
          <Pressable style={styles.linkButton} onPress={onAttachApple}>
            <Text style={styles.linkText}>เชื่อมต่อ Apple</Text>
          </Pressable>
        </View>
      ) : null}

      {isJaothuiAccount && canOpenBitkubNextWalletLink(profile.identity.provider) && !walletLinked ? (
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

      {!isReviewer ? <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitleLarge}>ควายของฉัน</Text>
          <Text style={styles.sectionCaption}>
            {profile.counts.ownedBuffalos} รายการในบัญชีนี้
            {linkedWallet ? ` · ${formatWalletAddress(linkedWallet.walletAddress)}` : ""}
          </Text>
        </View>
      </View> : null}

      {!isReviewer && ownedBuffalos.length > 0 ? (
        <View style={styles.buffaloGrid}>
          {ownedBuffalos.map((buffalo) => (
            <BuffaloCard key={buffalo.microchip} buffalo={buffalo} onPress={() => onOpenBuffalo(buffalo.microchip)} />
          ))}
        </View>
      ) : !isReviewer ? (
        <StateBlock
          title="ยังไม่พบควายในบัญชีนี้"
          message={
            walletLinked
              ? "บัญชีนี้เชื่อมต่อแล้ว แต่ยังไม่มีข้อมูลควายที่ผูกกับโปรไฟล์ JAOTHUI"
              : "บัญชี JAOTHUI นี้ยังไม่ได้ผูก Bitkub NEXT จึงยังไม่แสดงข้อมูลควายจาก wallet"
          }
        />
      ) : null}

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
  reviewerEntryCard: {
    alignItems: "center",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md,
  },
  reviewerEntryCopy: { flex: 1 },
  reviewerEntryTitle: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  reviewerEntryMessage: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  reviewerEntryButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  reviewerEntryButtonText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  reviewerLoginCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.md,
    ...shadow.gold,
  },
  reviewerLoginMessage: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  inputLabel: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  reviewerInput: {
    backgroundColor: colors.background,
    borderColor: colors.borderSoft,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.foreground,
    fontSize: 16,
    marginBottom: spacing.md,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  reviewerError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  reviewerBackButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: spacing.touchTarget,
  },
  reviewerBackText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "800",
  },
  reviewerFixtureCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  reviewerFixtureEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  reviewerFixtureMessage: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  reviewerFixtureStatus: {
    alignSelf: "flex-start",
    backgroundColor: colors.overlayBadge,
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reviewerFixtureStatusText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
  },
  disabledAction: { opacity: 0.55 },
  localE2eIndicator: {
    borderColor: "#66531c",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  localE2eIndicatorLabel: {
    color: "#d8b65c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  localE2eIndicatorValue: {
    color: "#ffffff",
    fontSize: 12,
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
  appleHelpButton: {
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.lg,
  },
  appleHelpText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "900",
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
