import {
  checkReviewerAvailabilityAfterActivation,
  recordReviewerLogoTap,
  REVIEWER_LOGO_TAP_WINDOW_MS,
} from "@/features/profile/reviewerAccessActivation";

describe("reviewer logo activation", () => {
  it("unlocks only on the seventh tap within five seconds", () => {
    let window = null;

    for (let tap = 1; tap <= 6; tap += 1) {
      const result = recordReviewerLogoTap(window, tap * 100);
      expect(result.shouldCheckAvailability).toBe(false);
      window = result.nextWindow;
    }

    const result = recordReviewerLogoTap(window, 700);
    expect(result.shouldCheckAvailability).toBe(true);
    expect(result.nextWindow).toBeNull();
  });

  it("resets an expired tap window instead of unlocking", () => {
    let window = null;

    for (let tap = 1; tap <= 6; tap += 1) {
      window = recordReviewerLogoTap(window, tap * 100).nextWindow;
    }

    const afterTimeout = recordReviewerLogoTap(window, REVIEWER_LOGO_TAP_WINDOW_MS + 101);
    expect(afterTimeout.shouldCheckAvailability).toBe(false);
    expect(afterTimeout.nextWindow).toEqual({ firstTapAt: REVIEWER_LOGO_TAP_WINDOW_MS + 101, tapCount: 1 });
  });

  it("does not request availability before activation", async () => {
    const getAvailability = jest.fn().mockResolvedValue({ available: true });
    const activation = recordReviewerLogoTap(null, 100);

    await expect(checkReviewerAvailabilityAfterActivation(activation, getAvailability)).resolves.toBe(false);
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("fails closed when the reviewer server gate is unavailable or errors", async () => {
    const activation = {
      nextWindow: null,
      shouldCheckAvailability: true,
    };

    await expect(
      checkReviewerAvailabilityAfterActivation(activation, jest.fn().mockResolvedValue({ available: false }))
    ).resolves.toBe(false);
    await expect(
      checkReviewerAvailabilityAfterActivation(activation, jest.fn().mockRejectedValue(new Error("offline")))
    ).resolves.toBe(false);
  });
});
