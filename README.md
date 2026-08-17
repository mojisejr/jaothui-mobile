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
