import { memo, useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
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
  const generation = useRef(0);
  const previous = useRef({ uri, retry });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const changed = previous.current.uri !== uri;
    const retried = previous.current.retry !== retry;
    previous.current = { uri, retry };
    if (!changed && !retried) return;
    if (!changed && candidate?.uri === uri) return;
    // A successful unchanged source keeps its mounted native Image/cache key.
    if (good?.uri === uri) { generation.current++; setCandidate(null); return; }
    const key = ++generation.current;
    setCandidate(uri ? { uri, key } : null);
  }, [candidate?.uri, good?.uri, retry, uri]);
  const accept = (layer: Layer, success: boolean) => {
    if (!alive.current || layer.key !== generation.current) return;
    if (success) setGood(layer);
    setCandidate(null);
  };
  // Stable keyed layer survives candidate→good; no second decode/remount on swap.
  const layers = good ? [good, ...(candidate && candidate.key !== good.key ? [candidate] : [])] : candidate ? [candidate] : [];
  return (
    <>
      {!good && !candidate ? (
        <View style={styles.fallback} accessible accessibilityRole="image" accessibilityLabel={`ไม่มีภาพ ${label}`}>
          <Text style={styles.fallbackText}>JAOTHUI</Text>
        </View>
      ) : null}
      {layers.map((layer) => (
        <PhotoLayer key={layer.key} layer={layer} label={label} hidden={Boolean(good && layer.key !== good.key)}
          candidate={layer.key === candidate?.key} onResult={(success) => accept(layer, success)} />
      ))}
    </>
  );
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
