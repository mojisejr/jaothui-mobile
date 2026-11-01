import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import Svg, { Path, Rect } from "react-native-svg";
import { colors, motion, radius, spacing, typography } from "@/design/tokens";

type CopyMicrochipProps = {
  microchip?: string | null;
  /** Reset local feedback when a recycled cell represents another buffalo. */
  identity?: string | number;
};
type CopyStatus = "idle" | "pending" | "success" | "error";
const feedback: Record<CopyStatus, string> = {
  idle: "แตะเพื่อคัดลอก",
  pending: "กำลังคัดลอก…",
  success: "คัดลอกแล้ว",
  error: "คัดลอกไม่สำเร็จ",
};
const FEEDBACK_MS = 1800;

export function CopyMicrochip({ microchip, identity }: CopyMicrochipProps) {
  // Availability checking must never transform the string passed to the clipboard.
  const available = typeof microchip === "string" && microchip.trim() !== "" && microchip.trim().toUpperCase() !== "N/A";
  if (!available) {
    return <View style={styles.unavailable}><Text style={styles.microchip}>{microchip?.trim() || "—"}</Text></View>;
  }
  return <CopyableMicrochip key={JSON.stringify([identity, microchip])} microchip={microchip} />;
}

function CopyableMicrochip({ microchip }: { microchip: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const mounted = useRef(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (!mounted.current || pending.current) return;
    pending.current = true;
    if (timer.current !== null) clearTimeout(timer.current);
    setStatus("pending");
    let next: CopyStatus;
    try {
      next = await Clipboard.setStringAsync(microchip) === true ? "success" : "error";
    } catch {
      next = "error";
    }
    if (!mounted.current) return;
    pending.current = false;
    setStatus(next);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (mounted.current) setStatus("idle");
    }, FEEDBACK_MS);
  }

  const color = status === "success" ? colors.success : status === "error" ? colors.danger : colors.gold;
  return (
    <Pressable
      onPress={copy}
      disabled={status === "pending"}
      accessibilityRole="button"
      accessibilityLabel={`คัดลอกไมโครชิป ${microchip}`}
      accessibilityHint={status === "error" ? "แตะเพื่อลองคัดลอกอีกครั้ง" : "คัดลอกเพื่อนำไปวางในฟอร์ม"}
      accessibilityValue={{ text: feedback[status] }}
      accessibilityState={{ busy: status === "pending", disabled: status === "pending" }}
      style={({ pressed }) => [styles.control, pressed && styles.pressed]}
    >
      <View style={styles.content} accessible={false} importantForAccessibility="no-hide-descendants">
        <Text style={styles.microchip}>{microchip}</Text>
        <View style={styles.feedback}>
          {/* Reserve the longest feedback at the current width/font scale. */}
          <Text style={[styles.feedbackText, styles.reserve]}>{feedback.error}</Text>
          <Text style={[styles.feedbackText, styles.feedbackOverlay, { color }]}>{feedback[status]}</Text>
        </View>
      </View>
      <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false} style={styles.icon}>
        {status === "success" ? <Path d="m5 12 4 4L19 6" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          : status === "error" ? <Path d="M12 5v9m0 4v1" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
            : <><Rect x={8} y={8} width={12} height={13} rx={2} stroke={color} strokeWidth={1.7} fill="none" /><Path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" stroke={color} strokeWidth={1.7} fill="none" /></>}
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: { minHeight: spacing.touchTarget, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.photo, backgroundColor: colors.surface },
  unavailable: { minHeight: spacing.touchTarget, justifyContent: "center" },
  pressed: { opacity: motion.pressOpacity },
  content: { flex: 1, minWidth: 0, gap: spacing.xxs },
  microchip: { ...typography.label, color: colors.muted, fontVariant: ["tabular-nums"], flexShrink: 1 },
  feedback: { position: "relative" },
  feedbackText: { ...typography.label },
  reserve: { opacity: 0 },
  feedbackOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  icon: { flexShrink: 0 },
});
