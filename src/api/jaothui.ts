import { mobileGet, mobileGetWithAuth } from "./client";
import type {
  MobileBuffaloList,
  MobileBuffaloQuery,
  MobileCertDetail,
  MobileCertificateImage,
  MobileHome,
  MobileMe,
  MobileProfile,
} from "@/types/mobile-api";

export function getHome() {
  return mobileGet<MobileHome>("/api/mobile/v1/home");
}

export function buildBuffaloQueryString(query: MobileBuffaloQuery = {}) {
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

  return params.toString();
}

export function getBuffalos(query: MobileBuffaloQuery = {}) {
  return mobileGet<MobileBuffaloList>(`/api/mobile/v1/buffalos?${buildBuffaloQueryString(query)}`);
}

export function getCertDetail(microchip: string) {
  return mobileGet<MobileCertDetail>(`/api/mobile/v1/certs/${encodeURIComponent(microchip)}`);
}

export function getCertCertificate(microchip: string) {
  return mobileGet<MobileCertificateImage>(
    `/api/mobile/v1/certs/${encodeURIComponent(microchip)}/certificate`
  );
}

export function getMe(sessionToken: string) {
  return mobileGetWithAuth<MobileMe>("/api/mobile/v1/me", sessionToken);
}

export function getProfile(sessionToken: string) {
  return mobileGetWithAuth<MobileProfile>("/api/mobile/v1/profile", sessionToken);
}
