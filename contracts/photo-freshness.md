# Published photo freshness (Mobile Phase 3)

The read-side authority is the frontend's public `/api/mobile/v1/buffalos/photos`
endpoint. This feature does not upload or change photos, Storage, certificates,
accounts, sessions or database configuration.

## Identity and transport

- Request `{ microchips: string[] }`, at most 40 raw IDs before deduplication.
  Microchip is the public entity key, independent of historical duplicate token
  IDs. Never derive a token string from the legacy numeric `tokenId` field.
- Optional `photoTokenId` is an exact server-provided decimal string; when present,
  a returned photo must also match that token. A result must match the requested
  microchip exactly. Duplicate/missing/unavailable/fallback/untrusted responses
  cannot replace the previous photo.
- URLs from refresh responses are restricted to the existing public Supabase
  photo bucket. No service credentials or direct Supabase client are used.
- The existing explicit local-E2E API override admits same-origin loopback
  `/media/<name>.<image-extension>` fixtures only; configured production API URLs
  do not create a general URL allowlist bypass.
- The request uses the existing no-store mobile transport with an eight-second
  AbortController deadline. An older backend's 404, network failure or 503 is
  fail-soft and does not clear the screen.

## Trigger and rendering policy

- Opt-in coordinators cover Home featured photos, the current virtualized list
  page, certificate-detail buffalo photo and existing owned-profile previews.
  Initial metadata seeds the photo state without an immediate duplicate request.
- A focused screen in AppState `active` can refresh on re-entry/foreground after
  a minimum age of 30 seconds. There is no periodic timer or idle reconnect
  guarantee. Automatic/manual bursts share an in-flight request.
- Home/detail pull-to-refresh and the list's native `onRefresh` check photos only.
  The accessible `รีเฟรชภาพ` button also supports non-gesture and RN Web users.
  Manual refresh bypasses age, not a 1.5-second tap cooldown or failure backoff.
- There is one bounded page-local map, not a catalog cache. New metadata/page
  generations invalidate stale requests. Recreated unchanged initial metadata
  cannot roll a successfully refreshed photo back to the original URL.
- A changed source loads as a candidate with a shared maximum of four mounted
  image loads and a 15-second loading deadline. A hung request releases its permit
  as a failure; late native callbacks after that deadline are ignored. The
  same-identity last decoded image stays visible until success;
  failure keeps it. Identity change immediately discards the prior animal's
  fallback. Stale load/error callbacks cannot replace a newer candidate.
- Candidate-to-good keeps the same keyed Image node. An unchanged successful URI
  keeps that node and its cache key. A later successful photo check can retry an
  earlier failed URI without appending a timestamp/random query parameter.
- The existing 3:2 contain frame, 4px inset, quiet hairline and virtualization are
  preserved. Photo refresh does not call Home/news/certificate/profile loaders or
  reset pagination, filters, scroll position or count-up presentation.
- Image-level queued/loading feedback remains busy after metadata refresh finishes,
  until actual `onLoad`, `onError` or the existing 15-second active-load deadline.
  Empty/missing and failed/timed-out sources are distinct; intentional same-URI
  retry is local to the frame and cannot invoke API/certificate/auth loaders.
  A successful same-identity bitmap remains during update or error. Shared card/
  detail composition reserves a consistent 44px status/action slot outside the
  photo for updating/error/retry, without changing the 3:2 frame or obscuring
  animal pixels. Retry stops nested card navigation. Initial loading/error lives
  inside the otherwise empty frame; reduced motion uses static pending feedback.

## Verification boundaries

Deterministic checks: `bun run validate`, `bun run test`,
`bun run test:buffalo-photo`, `bun run test:contract`. The legacy live contract
scripts can target an explicitly selected disposable fixture API; passing that
mode is synthetic contract proof, not production provider validation.

New tests cover transport caps/deadline/URL trust, lifecycle age/dedup/backoff,
generation and identity races, exact large token strings, bounded candidate work,
StrictMode replay, same-URI recovery and mounted Image load/error replacement.
The gallery's geometry and 14 policy-mutant checks remain in force.

At the 21 October 2026 implementation checkpoint, `expo install --check` reports
pre-existing patch drift in the main lock: Expo 54.0.36 (expected ~54.0.37),
constants 18.0.13 (~18.0.14), file-system 19.0.23 (~19.0.24), updates 29.0.19
(~29.0.20), jest-expo 54.0.17 (~54.0.18). This change adds/upgrades no dependency;
SDK compatibility therefore remains **Pending**, not a green gate.

Expo exports and RN Web observations are distinct from installed Android/iOS
cache, AppState, physical pull gesture and packaging acceptance. Record each
native lane independently; no Store/production/OTA readiness is implied here.

## SDK 54 alignment correction — 21 October 2026

This supersedes the earlier checkpoint's SDK-compatibility Pending status only.
After explicit owner approval, the five Expo-recommended SDK 54 patch ranges are
aligned: `expo ~54.0.37`, `expo-constants ~18.0.14`,
`expo-file-system ~19.0.24`, `expo-updates ~29.0.20`, and
`jest-expo ~54.0.18`. React 19.1.0, React Native 0.81.5, app version and build
profiles are unchanged. The lock includes the required Expo CLI/config/autolinking
transitives; compatible nested constants copies were deduplicated to 18.0.14.
No broad dependency refresh, override, SDK-major upgrade or check suppression was
used.

Expo Doctor's static-config warning was its marker heuristic: the old dynamic
object manually required app.json rather than returning Expo's supplied base.
The dynamic config now follows the [official base-config function pattern](https://docs.expo.dev/workflow/configuration/).
Exact serialized public effective configuration compares equal before/after for
unset, production, internal and development profiles, including the existing
development-only local-network ATS settings. No entitlement, identity, auth flow,
production networking policy, EAS profile or uploader behavior was changed.

Frozen install, `expo install --check`, Expo Doctor (18/18), validate, 108 unit
tests, gallery's 13 mounted tests/14 policy mutants, and the synthetic API/certificate
contracts pass. Expo exports are repeated separately with production API settings.
This dependency/configuration readiness does not close the pre-existing formal
DESIGN audit drift, installed Android/iOS acceptance, member-session QA, genuine
Dashboard canary or Store release gates.
