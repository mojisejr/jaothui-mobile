import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
  const bottomInset = showBottomNav ? bottomNav.contentPaddingBottom : spacing.xxl;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.fixedContent, contentStyle]}>{children}</View>
        {showBottomNav ? <BottomNav active={activeTab} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {showBottomNav ? <BottomNav active={activeTab} /> : null}
    </SafeAreaView>
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
