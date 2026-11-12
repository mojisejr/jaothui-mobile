import { Platform, Share } from "react-native";

/** Same public preview URL used by the website's LINE and copy-link actions. */
export function publicBuffaloLink(microchip: string) {
  return `https://jaothui.com/api/seo/og?microchip=${encodeURIComponent(microchip)}`;
}

export async function shareBuffaloLink(microchip: string) {
  const url = publicBuffaloLink(microchip);
  if (Platform.OS === "web" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) throw error;
    }
    return;
  }
  await Share.share(Platform.OS === "ios" ? { url } : { message: url });
}
