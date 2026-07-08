# JAOTHUI Mobile Project Map

**Project**: `jaothui-mobile`  
**Type**: Expo / React Native clean mobile app  
**API Authority**: `projects/jaothui-frontend` via `/api/mobile/v1/*`

## Landmarks

- `app/`: Expo Router route files only.
- `src/api/`: Mobile BFF client and endpoint wrappers.
- `src/features/`: screen-level feature modules.
- `src/components/`: reusable native primitives.
- `src/design/`: native token translation from JAOTHUI v2 design language.
- `src/types/`: API and view-model types.

## Data Flow

Expo screen -> `src/features/*` -> `src/api/jaothui.ts` -> `/api/mobile/v1/*` -> `jaothui-frontend`.

No tRPC, database, browser cookie auth, or raw web internals are imported here.

## Proof Lanes

- `rn-static-eye`: source structure, types, route files, API boundary checks.
- `expo-go-device-eye`: physical Expo Go observation.
- `native-eye`: dev build, emulator, or physical native build evidence.
