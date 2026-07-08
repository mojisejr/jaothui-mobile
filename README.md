# JAOTHUI Mobile

Expo / React Native mobile app for JAOTHUI.

## Oracle Boundaries

- `jaothui-frontend` is the Web + Mobile BFF API authority.
- This repo consumes only curated `/api/mobile/v1/*` endpoints.
- No raw tRPC, web cookie flow, database access, production secrets, signing keys, keystores, or app-store credentials belong here.
- Oracle memory artifacts stay in `/Users/non/dev/opilot/ψ/`, not in this app repo.

## Branch Flow

- `main` is protected.
- Work happens on feature branches.
- Delivery goes through pull requests into `main`.

## Phase 3 Goal

Build a small Expo/RN client spike against the real Mobile BFF API:

- Home
- Buffalo list
- Certificate detail

This phase can close static/source-level readiness. Device/native proof requires a separate Expo Go or native evidence pass.
