export const colors = {
  background: "#070707",
  surface: "#121212",
  surfaceRaised: "#1a1a1a",
  foreground: "#f5f5f5",
  muted: "#a3a3a3",
  gold: "#d6b15f",
  goldHover: "#e3c77a",
  success: "#3fa66a",
  danger: "#dc5f5f",
  borderSoft: "rgba(214, 177, 95, 0.18)",
  overlay: "rgba(0, 0, 0, 0.52)",
} as const;

export const spacing = {
  screenX: 20,
  cardRadius: 18,
  pillRadius: 999,
} as const;

export const shadow = {
  gold: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;
