import type { MobileProfile } from "@/types/mobile-api";

export function formatWalletAddress(walletAddress: string) {
  const normalized = walletAddress.trim();
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function getProfileDisplayName(profile: MobileProfile) {
  return profile.member?.name?.trim() || profile.member?.farmName?.trim() || "NFT Holder";
}

export function getProfileStatusLabel(profile: MobileProfile) {
  if (profile.member) return profile.member.statusLabel;
  return profile.counts.ownedBuffalos > 0 ? "ผู้ถือใบพันธุ์ประวัติ" : "เชื่อมต่อแล้ว";
}

export function getProfileContactLabel(profile: MobileProfile) {
  return profile.member?.email || profile.identity.email || formatWalletAddress(profile.identity.walletAddress);
}

export function getOwnedBuffaloPreview(profile: MobileProfile, limit = 6) {
  return profile.ownedBuffalos.slice(0, limit);
}
