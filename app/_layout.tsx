import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/design/tokens";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      />
    </>
  );
}
