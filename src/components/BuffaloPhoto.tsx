import { createContext, memo, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/design/tokens";
import { photoCandidateQueue, PHOTO_CANDIDATE_TIMEOUT_MS } from "@/photos/candidateQueue";

type BuffaloPhotoProps = {
  uri: string | null;
  label: string;
  /** Entity identity, NOT its URI: A's bitmap must never be B's fallback. */
  identity?: string;
  retry?: number;
};
type Layer = { uri: string; key: number };
type Feedback = { pending: boolean; failed: boolean; hasGood: boolean; retry: () => void; label: string; reduceMotion: boolean };
const FeedbackReport = createContext<((feedback: Feedback) => void) | null>(null);
const FeedbackState = createContext<Feedback | null>(null);

/** One photo and one reserved status slot; no screen/data loader is involved. */
export function BuffaloPhotoFeedback({ children }: { children?: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  return <FeedbackReport.Provider value={setFeedback}><FeedbackState.Provider value={feedback}><View>{children}</View></FeedbackState.Provider></FeedbackReport.Provider>;
}

export function BuffaloPhotoStatus() {
  const feedback = useContext(FeedbackState);
  return <View style={styles.statusSlot}>{feedback?.hasGood && (feedback.pending || feedback.failed)
    ? <PhotoFeedback feedback={feedback} compact /> : null}</View>;
}

/** The parent owns a fixed frame; this primitive never crops an identity photo. */
export const BuffaloPhoto = memo(function BuffaloPhoto({ uri, label, identity, retry = 0 }: BuffaloPhotoProps) {
  return (
    <View style={styles.inset}>
      <PhotoSource key={identity ?? label} uri={uri} label={label} retry={retry} />
    </View>
  );
});

function PhotoSource({ uri, label, retry = 0 }: BuffaloPhotoProps) {
  const [good, setGood] = useState<Layer | null>(null);
  const [candidate, setCandidate] = useState<Layer | null>(uri ? { uri, key: 0 } : null);
  const [failed, setFailed] = useState(false);
  // Fail closed until the OS preference is known; no decorative/custom animation.
  const [reduceMotion, setReduceMotion] = useState(true);
  const report = useContext(FeedbackReport);
  const generation = useRef(0);
  const previous = useRef({ uri, retry });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let mounted = true, observedEvent = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      observedEvent = true;
      if (mounted) setReduceMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && !observedEvent) setReduceMotion(enabled);
    }).catch(() => { /* Static pending feedback remains available. */ });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const changed = previous.current.uri !== uri;
    const retried = previous.current.retry !== retry;
    previous.current = { uri, retry };
    if (!changed && !retried) return;
    if (!changed && candidate?.uri === uri) return;
    // A successful unchanged source keeps its mounted native Image/cache key.
    if (good?.uri === uri) { generation.current++; setCandidate(null); setFailed(false); return; }
    const key = ++generation.current;
    setFailed(false);
    setCandidate(uri ? { uri, key } : null);
  }, [candidate?.uri, good?.uri, retry, uri]);
  const accept = (layer: Layer, success: boolean) => {
    if (!alive.current || layer.key !== generation.current) return;
    if (success) setGood(layer);
    setFailed(!success);
    setCandidate(null);
  };
  const retryImage = useCallback(() => {
    if (!alive.current || !uri || candidate || !failed) return;
    const key = ++generation.current;
    setFailed(false);
    setCandidate({ uri, key });
  }, [candidate, failed, uri]);
  useEffect(() => {
    report?.({ pending: Boolean(candidate), failed, hasGood: Boolean(good), retry: retryImage, label, reduceMotion });
  }, [candidate, failed, good, label, reduceMotion, report, retryImage]);
  // Stable keyed layer survives candidate→good; no second decode/remount on swap.
  const layers = good ? [good, ...(candidate && candidate.key !== good.key ? [candidate] : [])] : candidate ? [candidate] : [];
  return (
    <>
      {!good ? <View style={styles.emptyFeedback}>
        {!candidate && !failed ? <View style={styles.fallback} accessible accessibilityRole="image" accessibilityLabel={`ไม่มีภาพ ${label}`}>
          <Text style={styles.fallbackText}>JAOTHUI</Text><Text style={styles.feedbackText}>ยังไม่มีภาพ</Text>
        </View> : <PhotoFeedback feedback={{ pending: Boolean(candidate), failed, hasGood: false, retry: retryImage, label, reduceMotion }} />}
      </View> : null}
      {layers.map((layer) => (
        <PhotoLayer key={layer.key} layer={layer} label={label} hidden={Boolean(good && layer.key !== good.key)}
          candidate={layer.key === candidate?.key} onResult={(success) => accept(layer, success)} />
      ))}
    </>
  );
}

function PhotoFeedback({ feedback, compact = false }: { feedback: Feedback; compact?: boolean }) {
  const { pending, hasGood, label, retry, reduceMotion } = feedback;
  const copy = pending ? (hasGood ? "กำลังอัปเดตภาพ…" : "กำลังโหลดภาพ…")
    : (hasGood ? "อัปเดตภาพไม่สำเร็จ" : "โหลดภาพไม่สำเร็จ");
  return <View style={compact ? styles.compactFeedback : styles.feedback}>
    <View style={styles.feedbackMessage} accessible accessibilityLabel={`${copy} ${label}`} accessibilityState={{ busy: pending }}>
      {pending ? (reduceMotion ? <Text style={styles.staticIndicator} accessible={false}>◌</Text>
        : <ActivityIndicator size="small" color={colors.gold} accessible={false} />) : null}
      <Text style={styles.feedbackText} numberOfLines={compact ? 2 : undefined} maxFontSizeMultiplier={compact ? 1.5 : undefined}>{copy}</Text>
    </View>
    {!pending ? <Pressable accessibilityRole="button" accessibilityLabel={`ลองโหลดภาพ ${label} อีกครั้ง`}
      style={styles.retry} onPress={(event) => { event.stopPropagation(); retry(); }}>
      <Text style={styles.retryText}>ลองใหม่</Text>
    </Pressable> : null}
  </View>;
}

function PhotoLayer({ layer, label, hidden, candidate, onResult }: {
  layer: Layer; label: string; hidden: boolean; candidate: boolean; onResult: (success: boolean) => void;
}) {
  const [permitted, setPermitted] = useState(false);
  const release = useRef<(() => void) | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  const report = useRef(onResult);
  useEffect(() => { report.current = onResult; }, [onResult]);
  useEffect(() => {
    let mounted = true;
    finished.current = false;
    const cancel = photoCandidateQueue.acquire(() => {
      if (!mounted) return;
      setPermitted(true);
      deadline.current = setTimeout(() => {
        if (!mounted || finished.current) return;
        finished.current = true;
        cancel();
        report.current(false);
      }, PHOTO_CANDIDATE_TIMEOUT_MS);
    });
    release.current = cancel;
    return () => {
      mounted = false; finished.current = true;
      if (deadline.current) clearTimeout(deadline.current);
      cancel();
    };
  }, []);
  if (!permitted) return null;
  const finish = (success: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (deadline.current) clearTimeout(deadline.current);
    release.current?.();
    if (candidate) onResult(success);
  };
  return (
    <Image source={{ uri: layer.uri }} style={hidden ? [styles.image, styles.candidate] : styles.image}
      resizeMode="contain" accessibilityLabel={hidden ? undefined : label} accessible={!hidden}
      onLoad={() => finish(true)} onError={() => finish(false)} />
  );
}

const styles = StyleSheet.create({
  inset: {
    flex: 1,
    // 4px clears a 12px rounded clip even when the source fills both axes.
    padding: spacing.xxs,
    backgroundColor: colors.surface,
  },
  image: {
    flex: 1,
    width: "100%",
  },
  candidate: { ...StyleSheet.absoluteFillObject, opacity: 0 },
  emptyFeedback: { ...StyleSheet.absoluteFillObject, padding: spacing.xxs, justifyContent: "center", alignItems: "center", zIndex: 1 },
  statusSlot: { height: spacing.touchTarget, paddingHorizontal: spacing.xs },
  compactFeedback: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  feedback: { alignItems: "center", gap: spacing.xxs, maxWidth: "100%" },
  feedbackMessage: { flexShrink: 1, flexDirection: "row", alignItems: "center", gap: spacing.xxs },
  feedbackText: { color: colors.muted, fontSize: 11, lineHeight: 14, flexShrink: 1, textAlign: "center" },
  staticIndicator: { color: colors.gold, fontSize: 16 },
  retry: { minHeight: spacing.touchTarget, minWidth: spacing.touchTarget, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xxs },
  retryText: { color: colors.gold, fontSize: 12, fontWeight: "600" },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  fallbackText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
