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
- `src/features/home/countUp.ts`: pure easing/frame clock, presentation guard, preference-race and widest-glyph layout contracts.
- `src/features/home/useStatEnvironment.ts`: subscribed OS Reduce Motion plus route/AppState lifecycle.
- `src/components/StatCard.tsx`: static-compatible counter, preloading glyph ruler and stable final accessibility label.
- `src/components/Screen.tsx` -> `AppShell.tsx`: opt-in ScrollView viewport callbacks for real Home visibility (other routes unchanged).
- `src/types/`: API and view-model types.

## Data Flow

Expo screen -> `src/features/*` -> `src/api/jaothui.ts` -> `/api/mobile/v1/*` -> `jaothui-frontend`.

No tRPC, database, browser cookie auth, or raw web internals are imported here.

## Proof Lanes

- `rn-static-eye`: source structure, types, route files, API boundary checks.
- `expo-go-device-eye`: physical Expo Go observation.
- `native-eye`: dev build, emulator, or physical native build evidence.

Home 1.0.2 candidate: deterministic unit/API checks and all-platform Expo exports do not close
installed-native/runtime gates. iOS simulator dev-client, Android native client, and physical device
acceptance are named separately; cloud build success is packaging evidence only. User-owned
`.oracle-eye/` and `.playwright/` artifacts must be excluded from EAS archives.
