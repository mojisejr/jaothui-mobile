import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { bottomNav, colors, radius, shadow, spacing } from "@/design/tokens";

export type BottomNavTab = "home" | "buffalo" | "profile";

type BottomNavProps = {
  active?: BottomNavTab;
};

const logoSource = require("@/assets/images/thuiLogo.png");
// Expo's generated typed-route cache can lag behind newly added routes until dev tooling refreshes.
const profileRoute = "/profile" as never;

export function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const current = active ?? inferActiveTab(pathname);

  return (
    <View style={styles.nav} accessibilityRole="tablist">
      <View style={styles.sideGroup}>
        <NavSideTab
          active={current === "home"}
          label="หน้าหลัก"
          onPress={() => router.replace("/")}
        />
        <View style={styles.centerGap} />
        <NavSideTab
          active={current === "profile"}
          label="โปรไฟล์"
          onPress={() => router.replace(profileRoute)}
        />
      </View>

      <Pressable
        accessibilityLabel="NFT เพชรดีกรี"
        accessibilityRole="tab"
        accessibilityState={{ selected: current === "buffalo" }}
        onPress={() => router.replace("/buffalos")}
        style={({ pressed }) => [
          styles.centerButton,
          current === "buffalo" && styles.centerButtonActive,
          pressed && styles.pressed,
        ]}
      >
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </Pressable>
    </View>
  );
}

function NavSideTab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.sideTab, active && styles.sideTabActive, pressed && styles.pressed]}
    >
      <View style={[styles.sideDot, active && styles.sideDotActive]} />
      <Text style={[styles.sideLabel, active && styles.sideLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function inferActiveTab(pathname: string): BottomNavTab {
  if (pathname.startsWith("/buffalos")) return "buffalo";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

const styles = StyleSheet.create({
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: bottomNav.zIndex,
    minHeight: bottomNav.height,
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    backgroundColor: colors.surface,
    ...shadow.nav,
  },
  sideGroup: {
    minHeight: bottomNav.height,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
  },
  sideTab: {
    flex: 1,
    minWidth: bottomNav.sideMinWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  sideTabActive: {
    backgroundColor: "rgba(214, 177, 95, 0.06)",
  },
  sideDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.muted,
    opacity: 0.55,
  },
  sideDotActive: {
    width: 24,
    backgroundColor: colors.gold,
    opacity: 1,
  },
  sideLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  sideLabelActive: {
    color: colors.gold,
    fontWeight: "900",
  },
  centerGap: {
    width: bottomNav.centerSize + spacing.md,
  },
  centerButton: {
    position: "absolute",
    left: "50%",
    top: -(bottomNav.centerSize / 2),
    width: bottomNav.centerSize,
    height: bottomNav.centerSize,
    marginLeft: -(bottomNav.centerSize / 2),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    backgroundColor: colors.surfaceRaised,
    ...shadow.gold,
  },
  centerButtonActive: {
    borderColor: colors.gold,
  },
  logo: {
    width: bottomNav.centerIconSize,
    height: bottomNav.centerIconSize,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
