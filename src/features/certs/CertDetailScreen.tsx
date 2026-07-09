import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getCertCertificate, getCertDetail } from "@/api/jaothui";
import { MobileApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { colors, radius, shadow, spacing } from "@/design/tokens";
import { shareOrDownloadCertificate } from "@/features/certs/certificateFile";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { MobileBuffaloDetail, MobileCertificateImage } from "@/types/mobile-api";
import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";

type CertificateState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: MobileCertificateImage; error: null }
  | { status: "unavailable"; data: null; error: null }
  | { status: "error"; data: null; error: Error };

type DetailRow = {
  label: string;
  value: string;
  tone?: "default" | "success" | "muted";
};

export function CertDetailScreen() {
  const router = useRouter();
  const { microchip } = useLocalSearchParams<{ microchip: string }>();
  const certId = Array.isArray(microchip) ? microchip[0] : microchip;
  const loadCertDetail = useCallback(() => getCertDetail(certId), [certId]);
  const state = useAsyncResource(loadCertDetail);
  const [certificate, setCertificate] = useState<CertificateState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [fileAction, setFileAction] = useState<"idle" | "working" | "done" | "error">("idle");
  const [fileActionError, setFileActionError] = useState<string | null>(null);

  const certificateImageUri = useMemo(() => {
    if (certificate.status !== "success") return null;
    return `data:${certificate.data.mimeType};base64,${certificate.data.imageBase64}`;
  }, [certificate]);
  const certificateSummary = state.status === "success" ? state.data.buffalo.certificate : null;

  const loadCertificate = useCallback(() => {
    if (!certId) return;
    setCertificate({ status: "loading", data: null, error: null });
    setFileAction("idle");
    setFileActionError(null);

    getCertCertificate(certId)
      .then((data) => setCertificate({ status: "success", data, error: null }))
      .catch((error) => {
        if (error instanceof MobileApiError && error.code === "CERTIFICATE_UNAVAILABLE") {
          setCertificate({ status: "unavailable", data: null, error: null });
          return;
        }
        setCertificate({
          status: "error",
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  }, [certId]);

  useEffect(() => {
    if (state.status === "success") {
      if (hasCertificateSummary(certificateSummary)) {
        loadCertificate();
        return;
      }
      setCertificate({ status: "unavailable", data: null, error: null });
    }
  }, [certificateSummary, loadCertificate, state.status]);

  const handleShareCertificate = useCallback(async () => {
    if (certificate.status !== "success") return;
    setFileAction("working");
    setFileActionError(null);
    try {
      await shareOrDownloadCertificate(certificate.data);
      setFileAction("done");
    } catch (error) {
      setFileAction("error");
      setFileActionError(error instanceof Error ? error.message : String(error));
    }
  }, [certificate]);

  return (
    <Screen showBottomNav={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
      </View>

      {state.status === "loading" ? (
        <StateBlock title="กำลังโหลดใบพันธุ์ประวัติ" message={certId} />
      ) : null}

      {state.status === "error" ? (
        <StateBlock
          title="โหลดข้อมูลไม่สำเร็จ"
          message={state.error.message}
          actionLabel="ลองใหม่"
          onAction={state.reload}
        />
      ) : null}

      {state.status === "success" ? (
        <CertDetailContent
          buffalo={state.data.buffalo}
          certificate={certificate}
          certificateImageUri={certificateImageUri}
          fileAction={fileAction}
          fileActionError={fileActionError}
          rewardCount={state.data.rewards.length}
          onRetryCertificate={loadCertificate}
          onShareCertificate={handleShareCertificate}
        />
      ) : null}
    </Screen>
  );
}

function CertDetailContent({
  buffalo,
  certificate,
  certificateImageUri,
  fileAction,
  fileActionError,
  rewardCount,
  onRetryCertificate,
  onShareCertificate,
}: {
  buffalo: MobileBuffaloDetail;
  certificate: CertificateState;
  certificateImageUri: string | null;
  fileAction: "idle" | "working" | "done" | "error";
  fileActionError: string | null;
  rewardCount: number;
  onRetryCertificate: () => void;
  onShareCertificate: () => void;
}) {
  const rows = getDetailRows(buffalo, rewardCount, certificate.status);

  return (
    <View style={styles.content}>
      <View style={styles.heroImageFrame}>
        {buffalo.imageUrl ? (
          <Image source={{ uri: buffalo.imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>JAOTHUI</Text>
          </View>
        )}
        <View style={styles.ageBadge}>
          <Text style={styles.ageBadgeText}>{formatBuffaloAge(buffalo.ageMonths)}</Text>
        </View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>ใบพันธุ์ประวัติ</Text>
        <Text style={styles.name}>{displayValue(buffalo.name, "ไม่มีชื่อ")}</Text>
        <Text style={styles.microchip}>{displayValue(buffalo.microchip)}</Text>
        {hasValue(buffalo.detail) ? <Text style={styles.detail}>{buffalo.detail}</Text> : null}
      </View>

      <View style={styles.infoPanel}>
        {rows.map((row) => (
          <StatRow key={row.label} row={row} />
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>รูปใบรับรอง</Text>
            <Text style={styles.sectionSubtitle}>สำหรับตรวจสอบ บันทึก หรือแชร์จากมือถือ</Text>
          </View>
          {certificate.status === "success" ? <StatusPill label="พร้อมใช้งาน" /> : null}
        </View>

        {certificate.status === "loading" || certificate.status === "idle" ? (
          <Text style={styles.sectionNote}>กำลังโหลดรูปใบรับรอง...</Text>
        ) : null}

        {certificate.status === "unavailable" ? (
          <UnavailableCertificate onRetry={onRetryCertificate} />
        ) : null}

        {certificate.status === "error" ? (
          <View style={styles.emptyCertificate}>
            <Text style={styles.emptyTitle}>โหลดรูปใบรับรองไม่สำเร็จ</Text>
            <Text style={styles.sectionNote}>{certificate.error.message}</Text>
            <Pressable style={styles.secondaryButton} onPress={onRetryCertificate}>
              <Text style={styles.secondaryButtonText}>ลองใหม่</Text>
            </Pressable>
          </View>
        ) : null}

        {certificateImageUri ? (
          <View style={styles.certificatePreview}>
            <Image source={{ uri: certificateImageUri }} style={styles.certificateImage} resizeMode="contain" />
            <Pressable
              style={[styles.primaryButton, fileAction === "working" ? styles.primaryButtonDisabled : null]}
              onPress={onShareCertificate}
              disabled={fileAction === "working"}
            >
              <Text style={styles.primaryButtonText}>
                {fileAction === "working" ? "กำลังเตรียมไฟล์..." : "บันทึก / แชร์ใบรับรอง"}
              </Text>
            </Pressable>
            {fileAction === "done" ? <Text style={styles.actionNote}>เปิดหน้าบันทึกหรือแชร์ไฟล์แล้ว</Text> : null}
            {fileAction === "error" && fileActionError ? (
              <Text style={styles.errorNote}>{fileActionError}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
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

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function UnavailableCertificate({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.emptyCertificate}>
      <Text style={styles.emptyTitle}>ยังไม่มีรูปใบรับรอง</Text>
      <Text style={styles.sectionNote}>
        ข้อมูลควายตัวนี้เปิดดูได้แล้ว แต่ระบบยังไม่มีไฟล์รูปใบรับรองให้ดาวน์โหลด
      </Text>
      <Pressable style={styles.secondaryButton} onPress={onRetry}>
        <Text style={styles.secondaryButtonText}>ลองโหลดอีกครั้ง</Text>
      </Pressable>
    </View>
  );
}

function getDetailRows(
  buffalo: MobileBuffaloDetail,
  rewardCount: number,
  certificateStatus: CertificateState["status"]
): DetailRow[] {
  const hasCertificate = certificateStatus === "success" || hasCertificateSummary(buffalo.certificate);
  const hasDna = hasValue(buffalo.dna);

  return [
    { label: "อายุ", value: formatBuffaloAge(buffalo.ageMonths) },
    { label: "Signature ID", value: displayValue(buffalo.microchip) },
    { label: "วันเกิด", value: formatThaiBirthdate(buffalo.birthdate) },
    { label: "เพศ", value: displayValue(buffalo.sex) },
    { label: "แม่พันธุ์", value: displayValue(buffalo.motherId) },
    { label: "พ่อพันธุ์", value: displayValue(buffalo.fatherId) },
    {
      label: "แหล่งกำเนิด",
      value: `${formatOrigin(buffalo.origin)}${hasDna ? " · Verified" : ""}`,
      tone: hasDna ? "success" : "default",
    },
    { label: "ส่วนสูง", value: formatHeight(buffalo.height) },
    { label: "สี", value: displayValue(buffalo.color) },
    { label: "รางวัล", value: rewardCount > 0 ? `${rewardCount} รายการ` : "N/A", tone: rewardCount > 0 ? "success" : "muted" },
    {
      label: "ใบรับรอง",
      value: hasCertificate ? "ดูใบรับรอง" : certificateStatus === "loading" ? "กำลังตรวจสอบ" : "N/A",
      tone: hasCertificate ? "success" : "muted",
    },
  ];
}

function hasCertificateSummary(certificate: unknown) {
  if (!certificate || typeof certificate !== "object") return false;
  return "microchip" in certificate && hasValue((certificate as { microchip?: unknown }).microchip);
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text.length > 0 && text !== "N/A";
}

function displayValue(value: unknown, fallback = "N/A") {
  return hasValue(value) ? String(value) : fallback;
}

function formatOrigin(origin: string | null) {
  if (!hasValue(origin)) return "N/A";
  if (origin?.toLowerCase() === "thai") return "ไทย";
  return origin;
}

function formatHeight(height: string | null) {
  if (!hasValue(height)) return "N/A";
  return `${height} ซม.`;
}

const styles = StyleSheet.create({
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
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
    ...shadow.gold,
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  imageFallbackText: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "900",
  },
  ageBadge: {
    backgroundColor: colors.overlayBadge,
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    right: spacing.sm,
  },
  ageBadgeText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
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
  microchip: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
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
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 210,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  statusPill: {
    backgroundColor: "rgba(63, 166, 106, 0.16)",
    borderColor: "rgba(63, 166, 106, 0.5)",
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  statusPillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
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
  emptyCertificate: {
    marginTop: spacing.md,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 46,
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
  actionNote: {
    color: colors.success,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  errorNote: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
