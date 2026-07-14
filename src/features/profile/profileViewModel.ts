import type { MobileLinkedWalletIdentity, MobileProfile } from "@/types/mobile-api";

export function formatWalletAddress(walletAddress: string) {
  const normalized = walletAddress.trim();
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function getProfileDisplayName(profile: MobileProfile) {
  if (profile.member?.name?.trim()) return profile.member.name.trim();
  if (profile.member?.farmName?.trim()) return profile.member.farmName.trim();
  if (profile.identity.provider === "line" && profile.identity.displayName?.trim()) {
    return profile.identity.displayName.trim();
  }
  return "JAOTHUI Account";
}

export function getProfileStatusLabel(profile: MobileProfile) {
  if (profile.member) return profile.member.statusLabel;
  if (profile.identity.provider === "line" && !profile.identity.linkedWallet) {
    return "บัญชี LINE";
  }
  return profile.counts.ownedBuffalos > 0 ? "ผู้ถือใบพันธุ์ประวัติ" : "เชื่อมต่อแล้ว";
}

export function getProfileContactLabel(profile: MobileProfile) {
  const linkedWallet = getLinkedWallet(profile);
  return (
    profile.member?.email ||
    profile.identity.email ||
    (linkedWallet ? formatWalletAddress(linkedWallet.walletAddress) : "ยังไม่ได้ผูก Bitkub NEXT")
  );
}

export function getOwnedBuffaloPreview(profile: MobileProfile, limit = 6) {
  return profile.ownedBuffalos.slice(0, limit);
}

export function getLinkedWallet(profile: MobileProfile): MobileLinkedWalletIdentity | null {
  if (profile.identity.provider === "bitkub-next") {
    return {
      walletAddress: profile.identity.walletAddress,
      provider: "bitkub-next",
      email: profile.identity.email,
    };
  }
  return profile.identity.linkedWallet;
}

export function hasLinkedWallet(profile: MobileProfile) {
  return Boolean(getLinkedWallet(profile));
}

export function getWalletLabel(profile: MobileProfile) {
  const linkedWallet = getLinkedWallet(profile);
  return linkedWallet ? formatWalletAddress(linkedWallet.walletAddress) : "ยังไม่ได้ผูก";
}

export function getProfileAvatarUrl(profile: MobileProfile) {
  if (profile.member?.avatarUrl) return profile.member.avatarUrl;
  if (profile.identity.provider === "line") return profile.identity.avatarUrl;
  return null;
}
