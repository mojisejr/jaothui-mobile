/**
 * Copy intentionally shown only after the reviewer-only logo activation succeeds.
 * Credentials remain operator-provided through each store console.
 */
export const reviewerAccessCopy = {
  eyebrow: "REVIEWER ACCESS",
  title: "Sign in to Reviewer Sandbox",
  message:
    "Use only the review credentials provided in App Store Connect or Google Play Console. This opens an isolated, non-financial demo environment.",
  usernameLabel: "Username",
  usernamePlaceholder: "Reviewer username",
  passwordLabel: "Password",
  passwordPlaceholder: "Reviewer password",
  missingCredentials: "Enter the reviewer username and password provided in the store console.",
  signInFailed: "Unable to sign in to Reviewer Sandbox.",
  signInAccessibilityHint: "Submit the supplied credentials to access the isolated reviewer sandbox.",
  signIn: "Sign in to Reviewer Sandbox",
  signingIn: "Signing in...",
  back: "Back to Profile",
} as const;
