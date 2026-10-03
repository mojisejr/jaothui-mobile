import type { PropsWithChildren } from "react";
import { AppShell } from "@/components/AppShell";
import type { BottomNavTab } from "@/components/BottomNav";
import type { ScrollViewProps } from "react-native";

type ScreenProps = PropsWithChildren<{
  activeTab?: BottomNavTab;
  scroll?: boolean;
  showBottomNav?: boolean;
  onScroll?: ScrollViewProps["onScroll"];
  onViewportLayout?: ScrollViewProps["onLayout"];
}>;

export function Screen({ activeTab, children, scroll = true, showBottomNav = true, onScroll, onViewportLayout }: ScreenProps) {
  return (
    <AppShell activeTab={activeTab} scroll={scroll} showBottomNav={showBottomNav} onScroll={onScroll} onViewportLayout={onViewportLayout}>
      {children}
    </AppShell>
  );
}
