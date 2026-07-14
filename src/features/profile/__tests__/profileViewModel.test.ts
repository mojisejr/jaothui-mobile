import {
  formatWalletAddress,
  getOwnedBuffaloPreview,
  getLinkedWallet,
  getProfileContactLabel,
  getProfileDisplayName,
  getProfileStatusLabel,
  getWalletLabel,
  hasLinkedWallet,
} from "@/features/profile/profileViewModel";
import type { MobileProfile } from "@/types/mobile-api";

const baseProfile: MobileProfile = {
  identity: {
    walletAddress: "0x1234567890abcdef",
    email: "wallet@example.com",
    provider: "bitkub-next",
  },
  member: null,
  ownedBuffalos: [],
  counts: {
    ownedBuffalos: 0,
  },
};

describe("profile view model", () => {
  it("formats long wallet addresses for compact mobile display", () => {
    expect(formatWalletAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
    expect(formatWalletAddress("0x123")).toBe("0x123");
  });

  it("prefers member identity labels over wallet fallbacks", () => {
    const profile: MobileProfile = {
      ...baseProfile,
      member: {
        id: "member-1",
        name: "คุณนนท์",
        avatarUrl: null,
        email: "member@example.com",
        farmName: "JAOTHUI Farm",
        role: "member",
        statusLabel: "เจ้าของฟาร์ม",
      },
    };

    expect(getProfileDisplayName(profile)).toBe("คุณนนท์");
    expect(getProfileStatusLabel(profile)).toBe("เจ้าของฟาร์ม");
    expect(getProfileContactLabel(profile)).toBe("member@example.com");
  });

  it("uses NFT holder state when connected wallet has owned buffalo but no member", () => {
    const profile: MobileProfile = {
      ...baseProfile,
      ownedBuffalos: [
        {
          tokenId: 1,
          microchip: "123",
          name: "ทองคำ",
          imageUrl: null,
          sex: null,
          color: null,
          birthdate: null,
          birthday: null,
          ageMonths: null,
          certNo: null,
          rarity: null,
          href: "/certs/123",
        },
      ],
      counts: {
        ownedBuffalos: 1,
      },
    };

    expect(getProfileDisplayName(profile)).toBe("JAOTHUI Account");
    expect(getProfileStatusLabel(profile)).toBe("ผู้ถือใบพันธุ์ประวัติ");
    expect(getProfileContactLabel(profile)).toBe("wallet@example.com");
  });

  it("treats LINE-only as a valid logged-in account without wallet", () => {
    const profile: MobileProfile = {
      ...baseProfile,
      identity: {
        sessionVersion: 2,
        accountId: "account_1",
        lineUserId: "line-user-1",
        email: "line@example.com",
        displayName: "LINE Holder",
        avatarUrl: null,
        provider: "line",
        linkedWallet: null,
      },
    };

    expect(getProfileDisplayName(profile)).toBe("LINE Holder");
    expect(getProfileStatusLabel(profile)).toBe("บัญชี LINE");
    expect(getProfileContactLabel(profile)).toBe("line@example.com");
    expect(getLinkedWallet(profile)).toBeNull();
    expect(hasLinkedWallet(profile)).toBe(false);
    expect(getWalletLabel(profile)).toBe("ยังไม่ได้ผูก");
  });

  it("bounds owned buffalo preview for profile scrolling", () => {
    const profile: MobileProfile = {
      ...baseProfile,
      ownedBuffalos: Array.from({ length: 8 }, (_, index) => ({
        tokenId: index,
        microchip: `chip-${index}`,
        name: `ควาย ${index}`,
        imageUrl: null,
        sex: null,
        color: null,
        birthdate: null,
        birthday: null,
        ageMonths: null,
        certNo: null,
        rarity: null,
        href: `/certs/chip-${index}`,
      })),
      counts: {
        ownedBuffalos: 8,
      },
    };

    expect(getOwnedBuffaloPreview(profile)).toHaveLength(6);
  });
});
