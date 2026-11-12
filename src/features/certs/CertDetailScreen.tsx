import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { getCertCertificate, getCertRewards, getCertSummary } from "@/api/jaothui";
import { MobileApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { BuffaloPhoto, BuffaloPhotoFeedback, BuffaloPhotoStatus } from "@/components/BuffaloPhoto";
import { CopyMicrochip } from "@/components/CopyMicrochip";
import { StateBlock } from "@/components/StateBlock";
import { PhotoRefreshControl } from "@/components/PhotoRefreshControl";
import { usePhotoFreshness } from "@/photos/usePhotoFreshness";
import type { PhotoDisplay } from "@/photos/contract";
import { colors, radius, spacing } from "@/design/tokens";
import { hasCertificateSummary } from "@/features/certs/certificateAvailability";
import { shareOrDownloadCertificate } from "@/features/certs/certificateFile";
import { useCertResource } from "./useCertResource";
import { publicBuffaloLink, shareBuffaloLink } from "./shareBuffalo";
import { buffaloSex } from "@/utils/buffaloSex";
import type { MobileBuffaloDetail } from "@/types/mobile-api";
import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";

type DetailRow = {
  label: string;
  value: string;
  tone?: "default" | "success" | "muted";
};

export function CertDetailScreen() {
  const { microchip } = useLocalSearchParams<{ microchip: string }>();
  const certId = (Array.isArray(microchip) ? microchip[0] : microchip) ?? "";
  return <BuffaloRecord key={certId} certId={certId} />;
}

function BuffaloRecord({ certId }: { certId: string }) {
  const router = useRouter();
  const { state, load } = useCertResource(certId, getCertSummary);
  const buffalo = state.status === "success" ? state.data.buffalo : null;
  const entries = useMemo(() => buffalo ? [buffalo] : [], [buffalo]);
  const photos = usePhotoFreshness(entries);
  const missing = !certId || (state.status === "error" && state.error instanceof MobileApiError && state.error.code === "NOT_FOUND");
  return (
    <Screen showBottomNav={false} onRefresh={photos.refresh} refreshing={photos.refreshing}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
      </View>
      {missing ? <StateBlock title="ไม่พบข้อมูลควายตัวนี้" message="กลับไปค้นหาด้วยชื่อหรือเลขไมโครชิปอีกครั้ง" />
        : state.status === "error" ? <StateBlock title="โหลดประวัติควายไม่ได้" actionLabel="ลองอีกครั้ง" onAction={load} />
        : !buffalo ? <LoadingNote text="กำลังโหลดประวัติควาย…" />
        : <>
          <PhotoRefreshControl refreshing={photos.refreshing} status={photos.status} onRefresh={photos.refresh} />
          <CertDetailContent buffalo={buffalo} photo={photos.photos.get(buffalo.microchip)} />
        </>}
    </Screen>
  );
}

function LoadingNote({ text }: { text: string }) {
  return <View style={styles.loading} accessibilityLiveRegion="polite">
    <ActivityIndicator color={colors.gold} />
    <Text style={styles.sectionNote}>{text}</Text>
  </View>;
}

const actionPaths = {
  share: "M12 15V3m-5 5 5-5 5 5 M5 12v8h14v-8",
  link: "M10 14l4-4m-6 2-2 2a3 3 0 0 0 4 4l3-3m-2-6 3-3a3 3 0 0 1 4 4l-2 2",
};
function Action({ label, onPress, primary, busy, icon }: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  icon?: keyof typeof actionPaths;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} accessibilityState={{ disabled: !!busy }}
    onPress={onPress} style={[primary ? styles.primaryButton : styles.secondaryButton, icon && styles.linkButton, busy && styles.primaryButtonDisabled]}>
    {icon && <Svg accessible={false} width={17} height={17} viewBox="0 0 24 24">
      <Path d={actionPaths[icon]} fill="none" stroke={primary ? colors.background : colors.gold} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>}
    <Text style={primary ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
  </Pressable>;
}

function LinkActions({ microchip }: { microchip: string }) {
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  async function run(copy: boolean) {
    if (pending.current) return;
    pending.current = true;
    setNotice("");
    try {
      if (copy) {
        const copied = await Clipboard.setStringAsync(publicBuffaloLink(microchip));
        setNotice(copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์ไม่ได้ ลองอีกครั้ง");
      } else {
        await shareBuffaloLink(microchip);
      }
    } catch {
      setNotice(copy ? "คัดลอกลิงก์ไม่ได้ ลองอีกครั้ง" : "เปิดเมนูแชร์ไม่ได้ แตะคัดลอกลิงก์เพื่อส่งต่อ");
    } finally { pending.current = false; }
  }
  return <>
    <View style={styles.actions}>
      <Action label="แชร์ข้อมูลควาย" icon="share" primary onPress={() => void run(false)} />
      <Action label="คัดลอกลิงก์" icon="link" onPress={() => void run(true)} />
    </View>
    {notice ? <Text style={styles.sectionNote} accessibilityLiveRegion="polite">{notice}</Text> : null}
  </>;
}

function CertDetailContent({ buffalo, photo }: { buffalo: MobileBuffaloDetail; photo?: PhotoDisplay }) {
  const rows = getDetailRows(buffalo);
  const rewards = useCertResource(buffalo.microchip, getCertRewards);
  return (
    <View style={styles.content}>
      <BuffaloPhotoFeedback key={buffalo.microchip}>
        <View style={styles.heroImageFrame}>
          <BuffaloPhoto uri={photo ? photo.uri : buffalo.imageUrl} identity={buffalo.microchip} retry={photo?.retry} label={displayValue(buffalo.name, "ไม่มีชื่อ")} />
        </View>
        <BuffaloPhotoStatus />
      </BuffaloPhotoFeedback>

      <View style={styles.titleBlock}>
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>{buffalo.ageMonths !== null ? formatBuffaloAge(buffalo.ageMonths) : "ยังไม่ทราบอายุ"}</Text>
        </View>
        <Text style={styles.eyebrow}>ใบพันธุ์ประวัติ</Text>
        <Text style={styles.name}>{displayValue(buffalo.name, "ไม่มีชื่อ")}</Text>
        <CopyMicrochip microchip={buffalo.microchip} identity={buffalo.tokenId ?? buffalo.microchip} />
        {hasValue(buffalo.detail) ? <Text style={styles.detail}>{buffalo.detail}</Text> : null}
      </View>

      <LinkActions microchip={buffalo.microchip} />
      <View style={styles.infoPanel}>
        <Text style={[styles.sectionTitle, styles.panelTitle]}>ข้อมูลประจำตัว</Text>
        {rows.map((row) => <StatRow key={row.label} row={row} />)}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>รางวัล</Text>
        {rewards.state.status === "success"
          ? <Text style={styles.sectionNote}>{rewards.state.data.rewards.length ? `${rewards.state.data.rewards.length} รางวัล` : "ยังไม่มีรางวัลในทะเบียน"}</Text>
          : rewards.state.status === "error"
            ? <><Text style={styles.sectionNote}>โหลดข้อมูลรางวัลไม่ได้</Text><Action label="ลองโหลดรางวัลอีกครั้ง" onPress={rewards.load} /></>
            : <LoadingNote text="กำลังโหลดรางวัล…" />}
      </View>
      <CertificatePanel buffalo={buffalo} />
    </View>
  );
}

function CertificatePanel({ buffalo }: { buffalo: MobileBuffaloDetail }) {
  const { state, load } = useCertResource(buffalo.microchip, getCertCertificate, false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const available = hasCertificateSummary(buffalo.certificate);

  async function shareFile() {
    if (pending.current || state.status !== "success") return;
    pending.current = true;
    setSharing(true);
    setNotice("");
    try {
      await shareOrDownloadCertificate(state.data);
    } catch {
      setNotice("เปิดไฟล์สำหรับแชร์ไม่ได้ ลองอีกครั้ง");
    } finally {
      pending.current = false;
      setSharing(false);
    }
  }
  const certificateImageUri = state.status === "success" ? `data:${state.data.mimeType};base64,${state.data.imageBase64}` : null;
  return <View style={styles.section}>
    <Text style={styles.sectionTitle}>รูปใบรับรอง</Text>
    {!available ? <Text style={styles.sectionNote}>ยังไม่มีรูปใบรับรองในทะเบียน</Text>
      : state.status === "idle" ? <Action label="ดูรูปใบรับรอง" onPress={load} />
      : state.status === "loading" ? <LoadingNote text="กำลังเตรียมรูปใบรับรอง…" />
      : state.status === "error" ? <><Text style={styles.sectionNote}>โหลดรูปใบรับรองไม่ได้</Text><Action label="ลองโหลดรูปใบรับรองอีกครั้ง" onPress={load} /></>
      : <View style={styles.certificatePreview}>
          {certificateImageUri && <Image accessibilityLabel="รูปใบรับรอง" source={{ uri: certificateImageUri }} style={styles.certificateImage} resizeMode="contain" />}
          <Action primary label={sharing ? "กำลังเตรียมไฟล์…" : "แชร์รูปใบรับรอง"} onPress={shareFile} busy={sharing} />
          {notice ? <Text style={styles.errorNote} accessibilityLiveRegion="polite">{notice}</Text> : null}
        </View>}
  </View>;
}

function StatRow({ row }: { row: DetailRow }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{row.label}</Text>
      <Text
        style={[
          styles.statValue,
          row.tone === "success" ? styles.statValueSuccess : null,
          row.tone === "muted" ? styles.statValueMuted : null,
        ]}
      >
        {row.value}
      </Text>
    </View>
  );
}

function getDetailRows(buffalo: MobileBuffaloDetail): DetailRow[] {
  const hasDna = hasValue(buffalo.dna);
  const color = buffalo.color?.trim().toLowerCase();

  return [
    { label: "อายุ", value: buffalo.ageMonths !== null ? formatBuffaloAge(buffalo.ageMonths) : "ยังไม่มีข้อมูล" },
    { label: "วันเกิด", value: displayValue(formatThaiBirthdate(buffalo.birthdate)) },
    { label: "เพศ", value: buffaloSex(buffalo.sex).label },
    { label: "แม่พันธุ์", value: displayValue(buffalo.motherId) },
    { label: "พ่อพันธุ์", value: displayValue(buffalo.fatherId) },
    {
      label: "แหล่งกำเนิด",
      value: `${formatOrigin(buffalo.origin)}${hasDna ? " · ยืนยันด้วย DNA" : ""}`,
      tone: hasDna ? "success" : "default",
    },
    { label: "ส่วนสูง", value: formatHeight(buffalo.height) },
    { label: "สี", value: color === "black" ? "ดำ" : color === "albino" ? "เผือก" : displayValue(buffalo.color) },
  ];
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text.length > 0 && text !== "N/A";
}

function displayValue(value: unknown, fallback = "ยังไม่มีข้อมูล") {
  return hasValue(value) ? String(value) : fallback;
}

function formatOrigin(origin: string | null) {
  if (!hasValue(origin)) return "ยังไม่มีข้อมูล";
  if (origin?.toLowerCase() === "thai") return "ไทย";
  return origin;
}

function formatHeight(height: string | null) {
  if (!hasValue(height)) return "ยังไม่มีข้อมูล";
  return `${height} ซม.`;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  linkButton: { flexDirection: "row", flexGrow: 1, flexBasis: 135, gap: spacing.xs },
  loading: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm },
  panelTitle: { padding: spacing.md },
  header: {
    paddingTop: spacing.md,
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  backText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroImageFrame: {
    aspectRatio: 3 / 2,
    backgroundColor: colors.surface,
    borderColor: colors.photoHairline,
    borderRadius: radius.photo,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  ageBadge: {
    alignSelf: "flex-start",
  },
  ageBadgeText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "600",
  },
  titleBlock: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  name: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  infoPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  statRow: {
    alignItems: "center",
    borderBottomColor: colors.borderSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statLabel: {
    color: colors.muted,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "700",
  },
  statValue: {
    color: colors.foreground,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
  },
  statValueSuccess: {
    color: colors.success,
  },
  statValueMuted: {
    color: colors.muted,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  certificatePreview: {
    marginTop: spacing.md,
  },
  certificateImage: {
    aspectRatio: 1.414,
    backgroundColor: "#ffffff",
    borderRadius: radius.sm,
    width: "100%",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: spacing.touchTarget,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
  },
  errorNote: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
