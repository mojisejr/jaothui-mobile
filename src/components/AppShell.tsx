import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav, type BottomNavTab } from "@/components/BottomNav";
import { bottomNav, colors, spacing } from "@/design/tokens";

type AppShellProps = PropsWithChildren<{
  activeTab?: BottomNavTab;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  showBottomNav?: boolean;
}>;

export function AppShell({
  activeTab,
  children,
  contentStyle,
  scroll = true,
  showBottomNav = true,
}: AppShellProps) {
  const insets = useSafeAreaInsets();
  const topInset = insets.top;
  const bottomInset = showBottomNav ? bottomNav.contentPaddingBottom + insets.bottom : spacing.xxl + insets.bottom;

  if (!scroll) {
    return (
      <View style={styles.safe}>
        <View style={[styles.fixedContent, { paddingTop: topInset, paddingBottom: bottomInset }, contentStyle]}>
          {children}
        </View>
        {showBottomNav ? <BottomNav active={activeTab} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset, paddingBottom: bottomInset }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {showBottomNav ? <BottomNav active={activeTab} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenX,
  },
});
