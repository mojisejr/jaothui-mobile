import { mobileGet } from "./client";
import type {
  MobileBuffaloList,
  MobileBuffaloQuery,
  MobileCertDetail,
  MobileCertificateImage,
  MobileHome,
} from "@/types/mobile-api";

export function getHome() {
  return mobileGet<MobileHome>("/api/mobile/v1/home");
}

export function getBuffalos(query: MobileBuffaloQuery = {}) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("sortBy", query.sortBy ?? "latest");

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.sex && query.sex !== "all") params.set("sex", query.sex);
  if (query.color && query.color !== "all") params.set("color", query.color);
  if (query.ageValue?.trim()) {
    params.set("ageOperator", query.ageOperator ?? ">=");
    params.set("ageValue", query.ageValue.trim());
  }

  return mobileGet<MobileBuffaloList>(`/api/mobile/v1/buffalos?${params.toString()}`);
}

export function getCertDetail(microchip: string) {
  return mobileGet<MobileCertDetail>(`/api/mobile/v1/certs/${encodeURIComponent(microchip)}`);
}

export function getCertCertificate(microchip: string) {
  return mobileGet<MobileCertificateImage>(
    `/api/mobile/v1/certs/${encodeURIComponent(microchip)}/certificate`
  );
}
