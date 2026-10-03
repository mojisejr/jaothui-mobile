import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, radius, shadow, spacing, typography } from "@/design/tokens";
import { formatStatCount, isStatCount, startStatCountUp, statNumberWidth, type GlyphMetrics, type StatPresentation } from "@/features/home/countUp";

type StatCardProps = {
  value: string;
  unit?: string;
  label: string;
  id?: string;
  count?: number | null;
  availability?: "available" | "unavailable";
  visible?: boolean | null;
  active?: boolean;
  reduceMotion?: boolean | null;
  glyphMetrics?: GlyphMetrics | null;
  presentation?: StatPresentation;
};

/** Measure during Home loading, before successful cards first appear. */
export function StatGlyphRuler({ onMetrics }: { onMetrics: (metrics: GlyphMetrics) => void }) {
  const widths = useRef(new Map<string, number>());
  return (
    <View pointerEvents="none" style={styles.ruler} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {"0123456789,".split("").map((glyph) => (
        <Text key={glyph} style={styles.value} accessible={false} onTextLayout={(event) => {
          const width = event.nativeEvent.lines[0]?.width;
          if (typeof width !== "number" || width <= 0) return;
          widths.current.set(glyph, width);
          if (widths.current.size === 11) {
            onMetrics({ digit: Math.max(..."0123456789".split("").map((digit) => widths.current.get(digit)!)), comma: widths.current.get(",")! });
          }
        }}>{glyph}</Text>
      ))}
    </View>
  );
}

export function StatCard({ value, unit, label, id, count, availability, visible = null, active = false, reduceMotion = null, glyphMetrics = null, presentation }: StatCardProps) {
  const { fontScale } = useWindowDimensions();
  const [slotWidth, setSlotWidth] = useState<number | null>(null);
  const numeric = isStatCount(count) && availability !== "unavailable" ? count : null;
  const finalValue = availability === "unavailable" || count === null || (count !== undefined && numeric === null)
    ? "—" : numeric !== null ? formatStatCount(numeric) : value;
  const canPrepare = numeric !== null && numeric > 0 && !!glyphMetrics && reduceMotion === false && active && !!id && !!presentation;
  const prepared = useRef(canPrepare && !!id && !presentation?.has(id));
  const [display, setDisplay] = useState(() => prepared.current ? "0" : finalValue);
  const priorTarget = useRef(finalValue);
  useEffect(() => {
    // A new snapshot never restarts growth, even when cards survived the refresh.
    if (priorTarget.current !== finalValue) {
      priorTarget.current = finalValue;
      prepared.current = false;
      if (id) presentation?.consume(id);
      setDisplay(finalValue);
      return;
    }
    if (id && presentation?.has(id)) { setDisplay(finalValue); return; }
    if (!active || reduceMotion !== false || numeric === null || numeric === 0) {
      prepared.current = false;
      setDisplay(finalValue);
      if (visible === true && id) presentation?.consume(id);
      return;
    }
    if (visible === false) {
      if (canPrepare) { prepared.current = true; setDisplay("0"); }
      return;
    }
    if (visible !== true) return;
    const claimed = id && presentation?.consume(id);
    if (!claimed || !prepared.current || !glyphMetrics) { setDisplay(finalValue); return; }
    return startStatCountUp(numeric, (next) => setDisplay(formatStatCount(next)), {
      now: () => performance.now(), request: requestAnimationFrame, cancel: cancelAnimationFrame,
    });
  }, [active, canPrepare, finalValue, glyphMetrics, id, numeric, presentation, reduceMotion, visible]);
  const width = numeric !== null && glyphMetrics ? statNumberWidth(finalValue, glyphMetrics) : undefined;
  // Shrink from the FINAL widest reservation, never from each changing numeral.
  const numeralScale = width && slotWidth !== null ? Math.min(1, slotWidth / width) : 1;
  return (
    <View style={styles.card} accessible accessibilityLabel={`${label}, ${finalValue}${unit ? ` ${unit}` : ""}`}>
      <View style={styles.valueRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.numberSlot, { width, height: 28 * fontScale }]} onLayout={(event) => {
          const measured = event.nativeEvent.layout.width;
          setSlotWidth((previous) => previous === measured ? previous : measured);
        }}>
          <Text style={[styles.value, width !== undefined && styles.overlay, { fontSize: 22 * numeralScale, lineHeight: 28 * numeralScale }]} accessible={false} numberOfLines={1}
            adjustsFontSizeToFit={width === undefined} minimumFontScale={0.78}>
            {priorTarget.current !== finalValue ? finalValue : display}
          </Text>
        </View>
        {unit ? <Text style={styles.unit} accessible={false}> {unit}</Text> : null}
      </View>
      <Text style={styles.label} numberOfLines={2} accessible={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 92,
    padding: spacing.md,
    ...shadow.raised,
  },
  value: {
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  numberSlot: { flexShrink: 1 },
  overlay: { position: "absolute", left: 0, right: 0, top: 0 },
  ruler: { position: "absolute", opacity: 0, left: 0, top: 0 },
  unit: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  label: {
    ...typography.label,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
