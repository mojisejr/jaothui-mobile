import { motion } from "@/design/tokens";

/** Pure motion/layout contracts. Numeric truth comes only from the API count field. */
export const COUNT_UP_DURATION_MS = motion.countUpDurationMs;

export function isStatCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function formatStatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function countAt(target: number, elapsed: number, duration = COUNT_UP_DURATION_MS): number {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  return t === 1 ? target : Math.floor(target * (1 - (1 - t) ** 3));
}

export type GlyphMetrics = { digit: number; comma: number };

/** Reserve the widest digit for EVERY position, not merely the final string. */
export function statNumberWidth(value: string, metrics: GlyphMetrics): number {
  const digits = (value.match(/\d/g) ?? []).length;
  const commas = (value.match(/,/g) ?? []).length;
  return Math.ceil(digits * metrics.digit + commas * metrics.comma) + 2;
}

export function statsIntersectViewport(
  stats: { y: number; height: number } | null,
  viewport: { offset: number; height: number },
): boolean | null {
  if (!stats || viewport.height <= 0) return null;
  return stats.y < viewport.offset + viewport.height && stats.y + stats.height > viewport.offset;
}

export function createStatPresentation() {
  const consumed = new Set<string>();
  return {
    has: (id: string) => consumed.has(id),
    consume(id: string) {
      if (consumed.has(id)) return false;
      consumed.add(id);
      return true;
    },
  };
}
export type StatPresentation = ReturnType<typeof createStatPresentation>;

/** Subscribe before querying: a late initial query must never overwrite a newer event. */
export function createMotionPreference(onValue: (value: boolean) => void) {
  let eventSeen = false;
  let disposed = false;
  return {
    event(value: boolean) {
      eventSeen = true;
      if (!disposed) onValue(value);
    },
    initial(value: boolean) {
      if (!disposed && !eventSeen) onValue(value);
    },
    fail() {
      if (!disposed && !eventSeen) onValue(true);
    },
    dispose() { disposed = true; },
  };
}

export type FrameClock = {
  now: () => number;
  request: (callback: (timestamp: number) => void) => number;
  cancel: (id: number) => void;
};

export function startStatCountUp(target: number, onValue: (value: number) => void, clock: FrameClock) {
  const startedAt = clock.now();
  let cancelled = false;
  let frame: number | null = null;
  let previous = -1;
  const emit = (value: number) => {
    if (value !== previous) { previous = value; onValue(value); }
  };
  const tick = (timestamp: number) => {
    if (cancelled) return;
    const elapsed = timestamp - startedAt;
    emit(countAt(target, elapsed));
    if (elapsed < COUNT_UP_DURATION_MS) frame = clock.request(tick);
    else frame = null;
  };
  emit(0);
  frame = clock.request(tick);
  return () => {
    cancelled = true;
    if (frame !== null) clock.cancel(frame);
    emit(target);
  };
}
