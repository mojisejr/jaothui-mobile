---
design_md_version: 1
project: jaothui-mobile
source_contract: projects/jaothui-frontend/DESIGN.md
token_source: src/design/tokens.ts
verify_tokens:
  - name: colors.background
    expect: "#070707"
    probe: "source value in src/design/tokens.ts; app canvas and SafeArea background"
  - name: colors.surface
    expect: "#121212"
    probe: "source value in src/design/tokens.ts; cards and input surfaces"
  - name: colors.gold
    expect: "#d6b15f"
    probe: "source value in src/design/tokens.ts; primary action and active nav"
  - name: colors.success
    expect: "#3fa66a"
    probe: "source value in src/design/tokens.ts; verified/success states"
  - name: spacing.touchTarget
    expect: "44"
    probe: "source value in src/design/tokens.ts; minimum pressable height"
verify_eyes:
  - kind: rn-static-eye
    gate: advisory
    sees:
      - TypeScript source wiring
      - token names and primitive imports
      - route file existence
    does_not_see:
      - rendered layout
      - safe-area behavior on device
      - touch feel or scroll smoothness
    artifact_sink: /Users/non/dev/opilot/.playwright-mcp/jaothui-mobile-ui-parity/
    commands:
      - bun run validate
    claim_label: RN Static Token Gate Closed
  - kind: rn-web-eye
    gate: required-after-rendered-ui-changes
    sees:
      - Expo Web layout
      - route regressions
      - console and obvious image/render failures
    does_not_see:
      - Expo Go device feel
      - native Android/iOS packaging
      - true physical scroll performance
    artifact_sink: /Users/non/dev/opilot/.playwright-mcp/jaothui-mobile-ui-parity/
    commands:
      - bunx expo export --platform web --output-dir <tmp>
      - browser capture for the phase routes
    claim_label: RN Web Eye Closed
  - kind: expo-go-device-eye
    gate: manual-final-acceptance
    sees:
      - Samsung Flip7 Expo Go runtime
      - physical touch feel
      - safe-area behavior
      - list scroll and back-transition feel
    does_not_see:
      - native dev-client packaging
      - Play Store readiness
    artifact_sink: /Users/non/dev/opilot/ψ/memory/logs/jaothui-mobile/
    commands:
      - operator confirmation on Samsung Flip7 / Expo Go
    claim_label: Expo Go Device Eye Closed
primitives:
  - name: AppShell
    file: src/components/AppShell.tsx
    variants: [scroll, fixed-content, detail]
  - name: BottomNav
    file: src/components/BottomNav.tsx
    variants: [home, buffalo, profile]
  - name: Button
    file: src/components/Button.tsx
    variants: [gold-fill, gold-outline, ghost, disabled, loading]
  - name: Badge
    file: src/components/Badge.tsx
    variants: [gold, success, muted, danger]
  - name: FilterChip
    file: src/components/FilterChip.tsx
    variants: [active, inactive]
  - name: StatCard
    file: src/components/StatCard.tsx
    variants: [default, compact]
  - name: BuffaloCard
    file: src/components/BuffaloCard.tsx
    variants: [grid, featured, skeleton]
  - name: SearchInput
    file: src/components/SearchInput.tsx
    variants: [default, focused, disabled]
  - name: StateBlock
    file: src/components/StateBlock.tsx
    variants: [loading, empty, error, unavailable]
  - name: Skeleton
    file: src/components/Skeleton.tsx
    variants: [text, card, image, pill]
  - name: SettingsRow
    file: src/components/SettingsRow.tsx
    variants: [default, disabled, danger]
  - name: ProfileShell
    file: src/features/profile/ProfileShell.tsx
    variants: [disconnected, line-only, line-linked, legacy-bitkub, error]
patterns:
  - layered-token-architecture
  - tinted-shadow-glow
  - three-zone-app-shell
  - status-chip-badge
  - shape-vocabulary
---

# JAOTHUI Mobile - DESIGN.md

This is the native mobile design contract for `jaothui-mobile`. The web v2 contract in
`projects/jaothui-frontend/DESIGN.md` is the visual source of truth. This file defines how that
language becomes an Expo / React Native product experience without copying Tailwind, browser layout,
or web-only auth behavior.

Round 1 started as the public journey only. The current profile contract is LINE-first account
login with optional Bitkub NEXT wallet linking. Store, game, privilege, order, and farm-management
flows are still deferred.

## 1. Visual Theme & Atmosphere

JAOTHUI mobile is dark-first, premium, and grounded in Thai buffalo heritage. The product should feel
credible and inspectable, not decorative: real buffalo photos, certificate credibility, gold hierarchy,
and restrained green trust signals matter more than illustration.

One-line design philosophy:

> A native dark-gold-green pedigree app that makes buffalo identity, certificate proof, and public
> discovery feel calm, trustworthy, and fast on a phone.

Conceptually copied from web v2:
- near-black canvas;
- antique gold as the primary action and active state;
- green only for verified/success/trust;
- rounded dark surfaces with soft gold hairlines;
- raised center logo navigation;
- image-first buffalo cards and certificate credibility.

Intentionally native:
- React Native `StyleSheet` tokens instead of Tailwind classes;
- safe-area-aware bottom navigation instead of fixed browser nav;
- `FlatList` virtualization for all grid/list surfaces;
- native press feedback and skeletons instead of web hover/framer-motion behavior;
- disabled Profile shell instead of web Bitkub NEXT auth/wallet logic.

## 2. Color Palette & Roles

Canonical runtime tokens live in `src/design/tokens.ts`.

| Token | Value | Role |
|---|---:|---|
| `colors.background` | `#070707` | app canvas, SafeArea background |
| `colors.surface` | `#121212` | cards, inputs, bottom nav |
| `colors.surfaceRaised` | `#1a1a1a` | image fallback, selected surfaces, elevated panels |
| `colors.foreground` | `#f5f5f5` | primary text |
| `colors.muted` | `#a3a3a3` | labels, metadata, inactive nav |
| `colors.gold` | `#d6b15f` | primary action, active nav, certificate emphasis |
| `colors.goldHover` | `#e3c77a` | pressed/highlighted gold state |
| `colors.success` | `#3fa66a` | verified, connected, available |
| `colors.danger` | `#dc5f5f` | destructive/error states |
| `colors.warning` | `#d89b45` | caution and partial states |
| `colors.info` | `#6ea7d9` | neutral info only when needed |
| `colors.borderSoft` | `rgba(214, 177, 95, 0.18)` | gold hairline border |
| `colors.borderStrong` | `rgba(214, 177, 95, 0.32)` | active/selected border |
| `colors.overlay` | `rgba(0, 0, 0, 0.52)` | image scrim, modal overlay |
| `colors.overlayBadge` | `rgba(7, 7, 7, 0.72)` | text badge over imagery |
| `colors.skeletonBase` | `#161616` | skeleton base |
| `colors.skeletonHighlight` | `#24201a` | skeleton pulse highlight |
| `colors.focusRing` | `rgba(214, 177, 95, 0.42)` | focus/active glow |

Use raw hex only in `tokens.ts`. Components import semantic tokens.

## 3. Typography

React Native uses platform fonts unless a dedicated Thai-friendly font is added later. Text must be
legible on Android first.

| Role | Size | Weight | Line height | Notes |
|---|---:|---:|---:|---|
| screen title | 28 | 800 | 34 | product headers and hero titles |
| section title | 20 | 800 | 26 | grouped content headings |
| card title | 16 | 800 | 22 | buffalo names, stat card emphasis |
| body | 14 | 400 | 22 | Thai copy and descriptions |
| label | 12 | 600 | 16 | chips, metadata, field labels |
| caption | 11 | 600 | 14 | age badges, microcopy |

Rules:
- Do not scale font size with viewport width.
- Use tabular numbers for microchip, cert number, and counts.
- Use `numberOfLines` on compact card text.
- Avoid negative letter spacing. Letter spacing should be `0` unless a tiny all-caps brand label
  needs `0.8` to `1`.

## 4. Component Stylings

App surfaces are dark, rounded, and bordered with gold-tinted hairlines. Controls must read as native
mobile controls, not web buttons pasted into RN.

- `Button`: `gold-fill` for primary actions, `gold-outline` for secondary certificate/share actions,
  `ghost` for low-emphasis back or filter affordances. Minimum height is `44`.
- `Badge`: status display only. Gold for pedigree/category, green for verified/success, muted for
  neutral metadata, red only for error/destructive.
- `FilterChip`: horizontal native chips. Active chip is gold fill; inactive chip is surface with
  soft border. Chips do not resize the page when toggled.
- `StatCard`: small dense cards, 2 columns on phones. Values are foreground/gold, labels muted.
- `BuffaloCard`: image-first card with a 4:3 image area, real age badge over the image, name,
  microchip, and cert metadata. Must remain memoized and compatible with virtualized lists.
- `SearchInput`: dark card-like field, leading search icon when an icon library is available, gold
  focus border/ring, no web browser styling assumptions.
- `StateBlock`: one primitive owns empty, loading, error, and unavailable states. It may include an
  action button but must not create nested cards.
- `Skeleton`: subtle pulse using `colors.skeletonBase` and `colors.skeletonHighlight`; no bright
  shimmer bars.
- `SettingsRow` / `ProfileShell`: account utility surface. LINE is the primary login/account
  identity; Bitkub NEXT is an optional linked wallet panel after LINE login. LINE-only is a valid
  connected state and must not be treated as disconnected.

## 5. Layout Principles

The app is phone-first. Screens use a near-black full-screen canvas, safe areas, and a consistent
horizontal inset from `spacing.screenX`.

Spacing model:
- base scale: `4, 8, 12, 16, 20, 24, 32, 40`;
- screen horizontal inset: `20`;
- card padding: `16`;
- section gap: `24`;
- bottom-nav clearance: `bottomNav.contentPaddingBottom`.

Screen rules:
- Home uses a product hero, stats, featured buffalo, and a clear path into the center Cert/Buffalo
  journey.
- Cert/Buffalo journey uses a virtualized 2-column `FlatList`; never render a large grid in
  `ScrollView`.
- Cert detail may use `ScrollView`, but image and certificate sections should have fixed aspect
  ratios to avoid jumpy layout.
- Profile shell is reachable from bottom nav and supports disconnected, LINE-only, LINE-linked,
  legacy Bitkub, loading, and error states.
- Avoid card-in-card nesting. If a grouped section needs structure, use rows/dividers inside one
  surface or an unframed layout.

## 6. Depth & Elevation

Depth is gold-tinted and quiet. Use it to separate important surfaces, not every box.

- Base canvas: `colors.background`.
- First elevation: `colors.surface` with `colors.borderSoft`.
- Raised surface: `colors.surfaceRaised` with `colors.borderStrong` when selected.
- Gold depth: `shadow.gold` for cards and image-led surfaces.
- Bottom nav depth: `shadow.nav`, a lower, broader glow that keeps the nav anchored.
- Avoid heavy neutral shadows and bright gradient blobs.

## 7. Do's & Don'ts

Do:
- use `src/design/tokens.ts` for every color, radius, spacing, shadow, skeleton, and nav dimension;
- keep the public journey data-backed by `/api/mobile/v1/*`;
- preserve the accepted stutter-gate decision: `FlatList`, stable keys, batched rendering, memoized
  cards;
- use real buffalo/certificate imagery where available;
- make LINE-only Profile feel complete, not broken;
- keep animation light and useful.

Do not:
- copy Tailwind classes or web breakpoints into RN;
- make Bitkub NEXT the primary login identity;
- replace virtualized list screens with nested `ScrollView` grids;
- add decorative gradient orbs or stock-like imagery;
- put cards inside cards;
- use unbounded animations, repeated heavy transforms, or animated list items without device proof;
- report `Expo Go Device Eye Closed` from RN Web or static validation.

## 8. Responsive Behavior

JAOTHUI mobile targets phones first, with Samsung Flip7 / Expo Go as the physical acceptance device
for this mission.

- Minimum touch target: `spacing.touchTarget` (`44`).
- Bottom nav:
  - fixed to the bottom safe area;
  - 3 positions: Home, raised center logo for Buffalo/Cert journey, Profile;
  - content screens reserve `bottomNav.contentPaddingBottom`.
- Width behavior:
  - phone width uses 2-column cards where practical;
  - very narrow widths may fall back to single-column only if text or image integrity would break;
  - tablet layout is not optimized in this mission, but max widths may be used to avoid stretched
    content on RN Web.
- Detail pages may hide the bottom nav or preserve it intentionally, but must keep back behavior
  obvious and stable.

## 9. Agent Prompt Guide

> Build JAOTHUI mobile UI from `src/design/tokens.ts` and this `DESIGN.md`. Use web v2 as the
> visual source, but implement native RN primitives. Public journey includes Home, center-logo
> Cert/Buffalo journey, Cert detail/certificate image, and a LINE-first Profile shell with optional
> Bitkub NEXT wallet linking. Preserve `FlatList` virtualization and the Samsung Flip7 stutter-gate
> decisions. Do not import web-only tRPC/Bitkub React SDK logic into RN. Use `bun run validate` for
> deterministic checks, RN Web for rendered route evidence after UI changes, and Expo Go/device
> confirmation only when the phase asks for it.

## Primitives (Reuse-First)

| Primitive | File | Status | Ownership |
|---|---|---|---|
| `AppShell` | `src/components/AppShell.tsx` | exists | safe area, background, scroll/fixed layout, bottom inset |
| `BottomNav` | `src/components/BottomNav.tsx` | exists | Home, raised logo center action, Profile shell |
| `Button` | `src/components/Button.tsx` | to build | gold-fill, gold-outline, ghost, loading, disabled |
| `Badge` | `src/components/Badge.tsx` | to build | status/category display |
| `FilterChip` | `src/components/FilterChip.tsx` | to build | active/inactive filter controls |
| `StatCard` | `src/components/StatCard.tsx` | to build | compact stats |
| `BuffaloCard` | `src/components/BuffaloCard.tsx` | exists, upgrade | virtualized grid/featured cards |
| `SearchInput` | `src/components/SearchInput.tsx` | to build | list search |
| `StateBlock` | `src/components/StateBlock.tsx` | exists, upgrade | loading/empty/error/unavailable |
| `Skeleton` | `src/components/Skeleton.tsx` | to build | loading placeholders |
| `SettingsRow` | `src/components/SettingsRow.tsx` | exists | profile shell rows |
| `ProfileShell` | `src/features/profile/ProfileShell.tsx` | exists | LINE-first account and optional wallet link shell |

Reuse before create. If a primitive exists, upgrade it in place unless the phase explicitly calls for
a new component.

## Screen Contracts

### Home
- Uses `/api/mobile/v1/home`.
- Shows a premium hero, real stats, featured buffalo, and a primary path to the center journey.
- Replaces proof-app wording with product copy.
- Loading uses skeletons; errors use `StateBlock`.

### Cert/Buffalo Journey
- Reached by the raised center logo in bottom nav.
- Uses `/api/mobile/v1/buffalos` query params supported by the BFF.
- Includes search, filter chips/controls, result count, pagination, and virtualized 2-column cards.
- Recent viewed is deferred unless cheap and non-blocking.

### Cert Detail
- Uses `/api/mobile/v1/certs/:microchip` and the existing certificate image endpoint.
- Success fixture: `764040226601197`.
- Unavailable fixture: `764040226300035`.
- Keeps share/download behavior intact.
- Uses image-led layout, stat rows, reward/metadata section, and explicit unavailable/error states.

### Profile Shell
- Reachable from bottom nav.
- LINE is the primary account login.
- Bitkub NEXT is optional wallet linking after LINE login.
- LINE-only renders as a connected account with a wallet-link panel.
- LINE-linked and legacy Bitkub sessions may show wallet/member/buffalo data.
- OAuth is mediated through the mobile BFF; provider tokens must not be stored in the app.

## Animation Rules

Allowed:
- `Pressable` opacity or scale feedback (`motion.pressScale`, `motion.pressOpacity`);
- skeleton pulse (`motion.skeletonDurationMs`);
- optional one-time hero fade/slide after data resolves;
- bottom-nav active glow/opacity.

Not allowed in this mission:
- repeated decorative loops;
- per-card list entrance animations on long lists;
- layout animations that affect `FlatList` scroll performance;
- animation that needs native build proof before Expo Go can test it.

## Performance Contract

The stutter gate is binding:
- `BuffaloCard` stays memoized.
- Buffalo/Cert list stays virtualized with `FlatList`.
- Use stable keys based on microchip/cert id.
- Use `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, and `removeClippedSubviews` where
  appropriate.
- Keep image sizes bounded with fixed aspect ratios.
- Do not add global state or broad parent rerenders for search/filter/page controls.

## Design Brain Links

- `layered-token-architecture`: web source -> mobile semantic tokens -> primitives -> screens.
- `tinted-shadow-glow`: premium depth comes from gold-tinted elevation.
- `three-zone-app-shell`: content canvas + persistent bottom nav + raised center action.
- `status-chip-badge`: gold and green status semantics.
- `shape-vocabulary`: card, pill, nav, and hero radii are named tokens.

## Known Drift

- `Screen` is now a compatibility wrapper around `AppShell`; new shell behavior should be added to
  `AppShell` rather than duplicating screen containers.
- Current public route set is `/`, `/buffalos`, `/profile`, and `/certs/[microchip]`.
- `BuffaloCard` and `StateBlock` exist, but they predate this full contract and need visual/variant
  upgrades.
- Icon strategy is not finalized in code. Prefer an installed icon library if one is already present;
  otherwise keep text-only controls until the dependency decision is explicit.
- RN Web evidence is advisory/regression proof; Samsung Flip7 Expo Go remains the acceptance device
  for final mobile feel.
