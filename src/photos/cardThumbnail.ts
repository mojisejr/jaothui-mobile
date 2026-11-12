import { API_BASE_URL } from "@/api/client";
import { approvedPhotoUrl } from "./contract";

// Next Image's existing allowed widths. The detail screen keeps the full-size source.
const CARD_WIDTHS = [256, 384, 640, 750, 828, 1080] as const;
export function cardThumbnailUrl(source: string | null, pixelWidth: number): string | undefined {
  if (!source || !source.startsWith("https://") || !approvedPhotoUrl(source)) return undefined;
  const width = CARD_WIDTHS.find(size => size >= pixelWidth) ?? CARD_WIDTHS[CARD_WIDTHS.length - 1];
  return `${API_BASE_URL}/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=75`;
}
