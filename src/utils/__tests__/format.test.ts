import { formatBuffaloAge, formatThaiBirthdate } from "@/utils/format";

describe("formatBuffaloAge", () => {
  it("handles missing and sub-month ages", () => {
    expect(formatBuffaloAge(null)).toBe("น้อยกว่าหนึ่งเดือน");
    expect(formatBuffaloAge(undefined)).toBe("น้อยกว่าหนึ่งเดือน");
    expect(formatBuffaloAge(0)).toBe("น้อยกว่าหนึ่งเดือน");
  });

  it("formats floored month values", () => {
    expect(formatBuffaloAge(18)).toBe("18 เดือน");
    expect(formatBuffaloAge(18.9)).toBe("18 เดือน");
  });
});

describe("formatThaiBirthdate", () => {
  it("formats the canonical cert success fixture birthdate in Bangkok time", () => {
    expect(formatThaiBirthdate(1738195200000)).toBe("30 ม.ค. 2568");
  });

  it("falls back for missing or invalid dates", () => {
    expect(formatThaiBirthdate(null)).toBe("N/A");
    expect(formatThaiBirthdate(0)).toBe("N/A");
    expect(formatThaiBirthdate(Number.NaN)).toBe("N/A");
  });
});
