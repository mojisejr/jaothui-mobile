# JAOTHUI Mobile

Expo / React Native app for the JAOTHUI Mobile BFF.

## Boundary

- `jaothui-frontend` owns the web app and `/api/mobile/v1/*` API.
- This app consumes only the Mobile BFF API.
- Do not import tRPC, web cookie auth, database code, or Oracle memory files.
- `main` is protected. Work lands through pull requests.

## Setup

```bash
bun install
cp .env.example .env
bun run start
```

For Expo Go on a physical phone, set `EXPO_PUBLIC_JAOTHUI_API_BASE_URL` to a URL the phone can reach, such as the Mac LAN IP running `jaothui-frontend`.

## Validation

```bash
bun run phase3:static
bun run typecheck
bun run lint
bun run test:unit
bun run test:contract
```

`test:unit` is the fast local Jest suite. `test:contract` calls the cloud Mobile BFF fixtures and is intentionally separate from `validate` so routine static checks do not depend on network availability.

Expo Go device proof and native build proof are separate evidence lanes.

## Home real statistics and motion (1.0.2 candidate)

Home consumes the frontend's aggregate `/api/mobile/v1/home` stats. The optional numeric `count`,
`availability`, and `observedAt` fields are additive: an old server returns static `value` strings,
and old installed clients continue showing exact final strings after the backend deployment.
No database code, provider auth, or schema migration is added to this app.

New clients premeasure system-font glyphs during loading and count up once on actual visibility
over 1,200ms with ease-out cubic. Reduced Motion, blur/background, retry, old payloads, zero, and
unavailable metrics never cause fabricated counts or replay. Only the numeral component updates
each frame; final values remain accessible and units reserve the widest digit width.

For the new backend contract (without baking today's counts into tests):

```bash
EXPO_PUBLIC_JAOTHUI_API_BASE_URL=http://localhost:3100 JAOTHUI_REQUIRE_HOME_STATS_COUNT=1 bun run phase4a:api-contract
EXPO_PUBLIC_JAOTHUI_API_BASE_URL=http://localhost:3100 bun run phase5:cert-contract
```

Omit `JAOTHUI_REQUIRE_HOME_STATS_COUNT` to retain old-server compatibility checks. Candidate
exports/builds are not a production release or proof of installed iOS/Android motion. Native Eye
must name the tested client, build, OS, lifecycle and preference observations; Android native
runtime/physical performance stays pending if no SDK/device is available. See `RELEASE_HOME_STATS.md`
for merge/deployment/build sequencing; no automatic OTA or store publication is implied.

## Internal Distribution

This project is linked to EAS project `41406db1-3e4f-4663-b7d9-f71f83e2f32d` under the Expo owner configured in `app.json`.

Internal builds use:

- Android package: `com.jaothui.mobile`
- iOS bundle identifier: `com.jaothui.mobile`
- EAS channel: `internal`
- EAS Update branch: `internal`
- Public Mobile BFF URL: `https://www.jaothui.com`

Before creating an internal build, run:

```bash
bun run validate
bun run test
bun run test:contract
```

Android internal build:

```bash
bun run build:internal:android
```

iOS internal build:

```bash
bun run build:internal:ios
```

iOS internal installation requires Apple Developer credentials and registered device UDIDs for ad hoc builds. Android internal builds produce an APK install link from EAS and do not require a Google Play account.

## Local E2E development build

The local account-deletion E2E lane uses a separate iOS development-client build:

```bash
bun run build:development:ios
```

This profile keeps the production and internal API URLs unchanged. It enables only iOS local-network ATS support (`NSAllowsLocalNetworking`) for the disposable local API; it never enables `NSAllowsArbitraryLoads`. Set `EXPO_PUBLIC_JAOTHUI_LOCAL_E2E_API_BASE_URL` only in the local Metro process to the current reachable local API host. This dedicated override takes precedence only for that disposable Metro session and is absent from internal and production builds.

Publish a JS/assets-only internal update:

```bash
bun run update:internal -- --message "Short update note"
```

Use EAS Update only for JS, assets, and public UI/content changes that do not change native dependencies, plugins, app identifiers, permissions, Expo SDK, or other native runtime config. Native-layer changes require a fresh EAS build.
