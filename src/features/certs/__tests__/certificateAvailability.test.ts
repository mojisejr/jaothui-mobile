import { hasCertificateSummary } from "@/features/certs/certificateAvailability";

describe("hasCertificateSummary", () => {
  it("accepts certificate summaries with a real microchip", () => {
    expect(hasCertificateSummary({ microchip: "764040226601197" })).toBe(true);
  });

  it("rejects empty, missing, and N/A certificate summaries", () => {
    expect(hasCertificateSummary(null)).toBe(false);
    expect(hasCertificateSummary({})).toBe(false);
    expect(hasCertificateSummary({ microchip: "" })).toBe(false);
    expect(hasCertificateSummary({ microchip: "N/A" })).toBe(false);
  });
});
