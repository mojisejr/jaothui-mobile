import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getCertCertificate, getCertDetail } from "@/api/jaothui";
import { MobileApiError } from "@/api/client";
import { Screen } from "@/components/Screen";
import { StateBlock } from "@/components/StateBlock";
import { colors, shadow, spacing } from "@/design/tokens";
import { shareOrDownloadCertificate } from "@/features/certs/certificateFile";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { MobileCertificateImage } from "@/types/mobile-api";

type CertificateState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: MobileCertificateImage; error: null }
  | { status: "unavailable"; data: null; error: null }
  | { status: "error"; data: null; error: Error };

export function CertDetailScreen() {
  const router = useRouter();
  const { microchip } = useLocalSearchParams<{ microchip: string }>();
  const loadCertDetail = useCallback(() => getCertDetail(microchip), [microchip]);
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

  const loadCertificate = useCallback(() => {
    if (!microchip) return;
    setCertificate({ status: "loading", data: null, error: null });
    setFileAction("idle");
    setFileActionError(null);

    getCertCertificate(microchip)
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
  }, [microchip]);

  useEffect(() => {
    if (state.status === "success") {
      loadCertificate();
    }
  }, [loadCertificate, state.status]);

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
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>กลับ</Text>
        </Pressable>
      </View>

      {state.status === "loading" ? (
        <StateBlock title="กำลังโหลดใบพันธุ์ประวัติ" message={microchip} />
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
        <View style={styles.card}>
          {state.data.buffalo.imageUrl ? (
            <Image source={{ uri: state.data.buffalo.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}
          <View style={styles.body}>
            <Text style={styles.label}>ใบพันธุ์ประวัติ</Text>
            <Text style={styles.name}>{state.data.buffalo.name}</Text>
            <Text style={styles.microchip}>{state.data.buffalo.microchip}</Text>

            <View style={styles.detailGrid}>
              <Info label="เพศ" value={state.data.buffalo.sex} />
              <Info label="สี" value={state.data.buffalo.color} />
              <Info label="อายุ" value={formatAge(state.data.buffalo.ageMonths)} />
              <Info label="เลขใบรับรอง" value={state.data.buffalo.certNo} />
            </View>

            <Text style={styles.detail}>{state.data.buffalo.detail || "ไม่มีรายละเอียดเพิ่มเติม"}</Text>

            <View style={styles.certificateBox}>
              <View style={styles.certificateHeader}>
                <View>
                  <Text style={styles.rewardTitle}>รูปใบรับรอง</Text>
                  <Text style={styles.rewardText}>สำหรับตรวจสอบ บันทึก หรือแชร์จากมือถือ</Text>
                </View>
                {certificate.status === "success" ? (
                  <Text style={styles.certificateBadge}>พร้อมใช้งาน</Text>
                ) : null}
              </View>

              {certificate.status === "loading" || certificate.status === "idle" ? (
                <Text style={styles.certificateStatus}>กำลังโหลดรูปใบรับรอง...</Text>
              ) : null}

              {certificate.status === "unavailable" ? (
                <View style={styles.emptyCertificate}>
                  <Text style={styles.emptyTitle}>ยังไม่มีรูปใบรับรอง</Text>
                  <Text style={styles.rewardText}>
                    ข้อมูลควายตัวนี้เปิดดูได้แล้ว แต่ระบบยังไม่มีไฟล์รูปใบรับรองให้ดาวน์โหลด
                  </Text>
                  <Pressable style={styles.secondaryButton} onPress={loadCertificate}>
                    <Text style={styles.secondaryButtonText}>ลองโหลดอีกครั้ง</Text>
                  </Pressable>
                </View>
              ) : null}

              {certificate.status === "error" ? (
                <View style={styles.emptyCertificate}>
                  <Text style={styles.emptyTitle}>โหลดรูปใบรับรองไม่สำเร็จ</Text>
                  <Text style={styles.rewardText}>{certificate.error.message}</Text>
                  <Pressable style={styles.secondaryButton} onPress={loadCertificate}>
                    <Text style={styles.secondaryButtonText}>ลองใหม่</Text>
                  </Pressable>
                </View>
              ) : null}

              {certificateImageUri ? (
                <View style={styles.certificatePreview}>
                  <Image
                    source={{ uri: certificateImageUri }}
                    style={styles.certificateImage}
                    resizeMode="contain"
                  />
                  <Pressable
                    style={styles.primaryButton}
                    onPress={handleShareCertificate}
                    disabled={fileAction === "working"}
                  >
                    <Text style={styles.primaryButtonText}>
                      {fileAction === "working" ? "กำลังเตรียมไฟล์..." : "บันทึก / แชร์ใบรับรอง"}
                    </Text>
                  </Pressable>
                  {fileAction === "done" ? (
                    <Text style={styles.actionNote}>เปิดหน้าบันทึกหรือแชร์ไฟล์แล้ว</Text>
                  ) : null}
                  {fileAction === "error" && fileActionError ? (
                    <Text style={styles.errorNote}>{fileActionError}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.rewardBox}>
              <Text style={styles.rewardTitle}>รางวัล</Text>
              <Text style={styles.rewardText}>
                {state.data.rewards.length > 0
                  ? `${state.data.rewards.length} รายการ`
                  : "ยังไม่มีข้อมูลรางวัล"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

function formatAge(months: number | null) {
  if (!months || months < 1) return "น้อยกว่า 1 เดือน";
  return `${Math.floor(months)} เดือน`;
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: colors.borderSoft,
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: spacing.cardRadius,
    borderWidth: 1,
    marginTop: 18,
    overflow: "hidden",
    ...shadow.gold,
  },
  image: {
    aspectRatio: 4 / 3,
    width: "100%",
  },
  body: {
    padding: 18,
  },
  label: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  name: {
    color: colors.foreground,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 6,
  },
  microchip: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  info: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  infoValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 18,
  },
  rewardBox: {
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  certificateBox: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  certificateHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  certificateBadge: {
    backgroundColor: "rgba(63, 166, 106, 0.16)",
    borderColor: "rgba(63, 166, 106, 0.5)",
    borderRadius: spacing.pillRadius,
    borderWidth: 1,
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  certificateStatus: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 14,
  },
  certificatePreview: {
    marginTop: 14,
  },
  certificateImage: {
    aspectRatio: 1.414,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    width: "100%",
  },
  emptyCertificate: {
    marginTop: 14,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.gold,
    borderRadius: spacing.pillRadius,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 16,
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
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: "900",
  },
  actionNote: {
    color: colors.success,
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  errorNote: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  rewardTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  rewardText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
});
