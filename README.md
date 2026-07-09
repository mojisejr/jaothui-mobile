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
