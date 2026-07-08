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
