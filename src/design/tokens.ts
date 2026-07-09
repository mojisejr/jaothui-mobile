export const colors = {
  background: "#070707",
  surface: "#121212",
  surfaceRaised: "#1a1a1a",
  foreground: "#f5f5f5",
  muted: "#a3a3a3",
  gold: "#d6b15f",
  goldHover: "#e3c77a",
  success: "#3fa66a",
  warning: "#d89b45",
  info: "#6ea7d9",
  danger: "#dc5f5f",
  borderSoft: "rgba(214, 177, 95, 0.18)",
  borderStrong: "rgba(214, 177, 95, 0.32)",
  overlay: "rgba(0, 0, 0, 0.52)",
  overlayBadge: "rgba(7, 7, 7, 0.72)",
  skeletonBase: "#161616",
  skeletonHighlight: "#24201a",
  focusRing: "rgba(214, 177, 95, 0.42)",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  card: 18,
  hero: 28,
  nav: 32,
  pill: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screenX: 20,
  screenY: 24,
  cardGap: 12,
  cardPadding: 16,
  sectionGap: 24,
  touchTarget: 44,
  cardRadius: radius.card,
  pillRadius: radius.pill,
} as const;

export const shadow = {
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
  raised: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  nav: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export const typography = {
  screenTitle: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800" },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 22, fontWeight: "400" },
  label: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: "600" },
} as const;

export const bottomNav = {
  height: 64,
  centerSize: 64,
  centerIconSize: 40,
  sideMinWidth: 96,
  contentPaddingBottom: 96,
  zIndex: 40,
} as const;

export const skeleton = {
  borderRadius: radius.md,
  pulseOpacity: 0.62,
} as const;

export const motion = {
  pressScale: 0.98,
  pressOpacity: 0.82,
  skeletonDurationMs: 1200,
  entranceDurationMs: 220,
} as const;
