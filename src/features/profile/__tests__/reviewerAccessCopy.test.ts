import { reviewerAccessCopy } from "@/features/profile/reviewerAccessCopy";

describe("reviewer access copy", () => {
  it("gives a store reviewer English console guidance without embedding credentials", () => {
    const copy = Object.values(reviewerAccessCopy).join(" ");

    expect(copy).toContain("App Store Connect");
    expect(copy).toContain("Google Play Console");
    expect(copy).toContain("isolated, non-financial demo environment");
    expect(copy).not.toMatch(/bitkub|otp|password:\s*\S+/i);
  });

  it("uses the same Reviewer Sandbox screen label in the title and submit action", () => {
    expect(reviewerAccessCopy.title).toBe("Sign in to Reviewer Sandbox");
    expect(reviewerAccessCopy.signIn).toBe("Sign in to Reviewer Sandbox");
  });
});
