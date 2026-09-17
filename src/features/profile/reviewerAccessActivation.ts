export const REVIEWER_LOGO_TAP_COUNT = 7;
export const REVIEWER_LOGO_TAP_WINDOW_MS = 5_000;

export type ReviewerLogoTapWindow = {
  firstTapAt: number;
  tapCount: number;
};

export type ReviewerLogoTapResult = {
  nextWindow: ReviewerLogoTapWindow | null;
  shouldCheckAvailability: boolean;
};

/**
 * Records one disconnected-Profile logo tap. The gesture is intentionally a
 * UI discovery mechanism only; server availability and reviewer credentials
 * remain the authorization boundary.
 */
export function recordReviewerLogoTap(
  window: ReviewerLogoTapWindow | null,
  now: number
): ReviewerLogoTapResult {
  const startsNewWindow =
    !window || now < window.firstTapAt || now - window.firstTapAt > REVIEWER_LOGO_TAP_WINDOW_MS;

  const nextWindow = startsNewWindow
    ? { firstTapAt: now, tapCount: 1 }
    : { firstTapAt: window.firstTapAt, tapCount: window.tapCount + 1 };

  if (nextWindow.tapCount !== REVIEWER_LOGO_TAP_COUNT) {
    return { nextWindow, shouldCheckAvailability: false };
  }

  return { nextWindow: null, shouldCheckAvailability: true };
}

/** Calls the server gate only after the exact local activation threshold. */
export async function checkReviewerAvailabilityAfterActivation(
  activation: ReviewerLogoTapResult,
  getAvailability: () => Promise<{ available: boolean }>
): Promise<boolean> {
  if (!activation.shouldCheckAvailability) return false;

  try {
    return (await getAvailability()).available === true;
  } catch {
    return false;
  }
}
