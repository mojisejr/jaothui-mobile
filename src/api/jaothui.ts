import { mobileGet } from "./client";
import type { MobileBuffaloList, MobileCertDetail, MobileHome } from "@/types/mobile-api";

export function getHome() {
  return mobileGet<MobileHome>("/api/mobile/v1/home");
}

export function getBuffalos(page = 1) {
  return mobileGet<MobileBuffaloList>(`/api/mobile/v1/buffalos?page=${page}&sortBy=latest`);
}

export function getCertDetail(microchip: string) {
  return mobileGet<MobileCertDetail>(`/api/mobile/v1/certs/${encodeURIComponent(microchip)}`);
}
