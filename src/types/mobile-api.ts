export type MobileOk<T> = {
  ok: true;
  data: T;
  requestId?: string;
};

export type MobileErr = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
};

export type MobileResponse<T> = MobileOk<T> | MobileErr;

export type MobileBuffaloCard = {
  tokenId: number | null;
  microchip: string;
  name: string;
  imageUrl: string | null;
  sex: string | null;
  color: string | null;
  birthdate: number | null;
  birthday: string | null;
  ageMonths: number | null;
  certNo: string | null;
  rarity: string | null;
  href: string;
};

export type MobileBuffaloSexFilter = "all" | "female" | "male";
export type MobileBuffaloColorFilter = "all" | "black" | "albino";
export type MobileBuffaloAgeOperator = ">" | "<" | ">=" | "<=" | "=";
export type MobileBuffaloSort = "latest" | "oldest" | "youngest";

export type MobileBuffaloQuery = {
  page?: number;
  sex?: MobileBuffaloSexFilter;
  color?: MobileBuffaloColorFilter;
  ageOperator?: MobileBuffaloAgeOperator;
  ageValue?: string;
  sortBy?: MobileBuffaloSort;
  search?: string;
};

export type MobileReward = {
  id: string;
  microchip: string;
  eventName: string;
  eventDate: string | null;
  rewardName: string;
  rewardImage: string | null;
};

export type MobileBuffaloDetail = MobileBuffaloCard & {
  origin: string | null;
  detail: string | null;
  height: string | null;
  dna: string | null;
  fatherId: string | null;
  motherId: string | null;
  certificate: unknown;
  actions: {
    certificate: string;
    rewardDetailTemplate: string;
    share: string;
  };
};

export type MobileHome = {
  hero: {
    title: string;
    subtitle: string;
    primaryAction: {
      label: string;
      href: string;
    };
  };
  stats: {
    id: string;
    value: string;
    unit: string;
    label: string;
  }[];
  featured: MobileBuffaloCard[];
};

export type MobileNewsEventType = "news" | "event" | "announcement";

export type MobileNewsEventCard = {
  id: string;
  title: string;
  slug: string;
  type: MobileNewsEventType;
  typeLabel: string;
  featured: boolean;
  priority: number;
  publishedAt: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
  displayDate: string;
  location: string | null;
  excerpt: string;
  coverImageUrl: string | null;
  ctaLabel: string;
  ctaUrl: string | null;
};

export type MobileNewsEvents = {
  items: MobileNewsEventCard[];
};

export type MobileBuffaloList = {
  items: MobileBuffaloCard[];
  pagination: {
    page: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
  };
};

export type MobileCertDetail = {
  buffalo: MobileBuffaloDetail;
  rewards: MobileReward[];
};

export type MobileCertificateImage = {
  microchip: string;
  tokenId: string;
  mimeType: "image/jpeg" | string;
  encoding: "base64" | string;
  imageBase64: string;
};

export type MobileBitkubNextIdentity = {
  sessionVersion?: 1;
  walletAddress: string;
  email: string | null;
  provider: "bitkub-next";
};

export type MobileBitkubNextSession = {
  sessionToken: string;
  expiresAt: number;
  identity: MobileBitkubNextIdentity;
};

export type MobileLinkedWalletIdentity = {
  walletAddress: string;
  email: string | null;
  provider: "bitkub-next";
};

export type MobileLineAccountIdentity = {
  sessionVersion: 2;
  accountId: string;
  lineUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  provider: "line";
  linkedWallet: MobileLinkedWalletIdentity | null;
};

export type MobileLineAccountSession = {
  sessionToken: string;
  expiresAt: number;
  identity: MobileLineAccountIdentity;
};

export type MobileSession = MobileBitkubNextSession | MobileLineAccountSession;

export type MobileAccountIdentity = MobileBitkubNextIdentity | MobileLineAccountIdentity;

export type MobileMe = {
  identity: MobileAccountIdentity;
};

export type MobileProfile = {
  identity: MobileAccountIdentity;
  member: {
    id: string | number;
    name: string | null;
    avatarUrl: string | null;
    email: string | null;
    farmName: string | null;
    role: string | null;
    statusLabel: string;
  } | null;
  ownedBuffalos: MobileBuffaloCard[];
  counts: {
    ownedBuffalos: number;
  };
};
