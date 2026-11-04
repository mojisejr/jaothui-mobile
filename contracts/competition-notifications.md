# Competition notifications (#35)

Native implementation is dormant until the backend registration switch is enabled.
This PR does not build, deploy, configure provider credentials or send notifications.

- Expo SDK54-compatible `expo-notifications`/`expo-device`; `competition-reminders`
  Android channel. App1.0.8 is a new native runtime; never OTA this native-module
  change into installed1.0.7.
- Profile uses device-scoped explicit consent, with server-binding, permission,
  blocked, paused, pending-disable and unavailable states. No permission prompt
  on Home/app startup. Expo Go/simulators do not claim native-push support.
- Server derives ownership from Bearer session. Stable UUID is in SecureStore;
  refresh/rotation preserves it. Token and disable-only generation capability stay
  private in SecureStore and are never logged or put in navigation URLs.
- Explicit logout, account switch and deletion revoke the installation. Offline
  logout retains only a disable capability for retry. Ordinary auth expiry does
  not erase consent. Late responses cannot mutate the next account's binding.
- All notification APIs use `{ok:true,data}` / `{ok:false,error}`. Mobile path:
  `/api/mobile/v1/notifications/installation` GET/PUT; public disable-only POST:
  `/api/notifications/revoke`. These depend on Front issue226 accepted backend.
- Server `available:false` does not remove the opt-out action for prior consent.
  OS grant alone is not “enabled”; secure local and server generations must agree.
- Payload allowlist: `kind=competition-reminder`, stable `eventId`, optional
  `expiresAt` and `reminderId`. No URL accepted. Taps open `/registrations` with an
  exact eventId and period all, using the existing private owned-history API.
  A10-minute SecureStore intent survives login and is consumed once for its
  expected account. Already-authenticated history clears it on successful load.
- Current gates: automated/static only. Native Eye remains Pending until owner
  authorizes fresh Android/iOS binaries and real-device permission/background/tap
  acceptance. No APNs/FCM delivery claim follows from Jest or TypeScript.

Automated checks: `bun run validate`, `bun run test:unit`, and
`bunx expo install --check`. Existing `test:contract` is a separate live public
Home/cert HTTP smoke and requires an available backend; it is not a push send test.
