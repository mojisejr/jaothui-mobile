import type { PropsWithChildren } from "react";
import { AppShell } from "@/components/AppShell";
import type { BottomNavTab } from "@/components/BottomNav";

type ScreenProps = PropsWithChildren<{
  activeTab?: BottomNavTab;
  scroll?: boolean;
  showBottomNav?: boolean;
}>;

export function Screen({ activeTab, children, scroll = true, showBottomNav = true }: ScreenProps) {
  return (
    <AppShell activeTab={activeTab} scroll={scroll} showBottomNav={showBottomNav}>
      {children}
    </AppShell>
  );
}
