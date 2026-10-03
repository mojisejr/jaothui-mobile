# Home statistics — controlled web / iOS / Android delivery

This candidate changes public Home counts and adds a one-shot 1,200ms
easeOutCubic count-up. It does not change auth, wallets, database schema or data.
No production OTA, automatic merge, automatic submission or public publish.

## Source contract

Backend/web repo `mojisejr/jaothui-front`: `HOME_STATS_DATA.md` is authoritative.
Both web and mobile API use the same read-only server service. Counts mean all
legacy Users, all Pedigrees, published JAOTHUI Event records minus the reviewed
test ID, and Pedigrees with a matching Certificate. Current totals are not
constants; service snapshots cache for60s and web also uses60s ISR.
An unavailable source must show —, not zero or old marketing placeholders.

## Order of operations

1. Review and merge the frontend PR to `main`. Let the normal production deploy
   finish. No SQL migration, new secret or Apple key is needed for this feature.
2. Verify `GET https://www.jaothui.com/api/mobile/v1/home`: each statistic keeps
   `id,value,unit,label` and adds `count,availability,observedAt`. Reconcile with
   source aggregates at a named time, allowing cache/ISR delay. Never copy user
   rows or secrets into verification logs. Confirm `/v2` and old installed apps
   now show truthful static final values, with no trailing `+`.
3. Review and merge the mobile PR to `main`. Candidate builds may be produced
   earlier from the same tested feature commit; record that exact source hash.
   Before backend deployment a new app seeing a legacy payload without `count`
   intentionally remains static. A mobile binary alone cannot fix old server data.
4. Candidate packaging uses `eas build --platform all --profile production`:
   appVersion/runtime1.0.2 for both platforms, remote auto-incremented build
   numbers, existing credentials, API `https://www.jaothui.com`. Do not add
   `--auto-submit`; verify build identity and production config before upload.
   `.easignore` excludes environment files, local Eye artifacts and generated
   native directories; preserve these local files instead of deleting them.
5. iOS: upload the approved candidate through EAS Submit or App Store Connect,
   assign to TestFlight testers, then install/open. Android: manually upload the
   AAB to an Internal testing draft, publish to the chosen testers, and install
   from their Play opt-in link. These are later explicitly authorized operator
   actions, not side effects of the build command.
6. On each installed platform check public Home, first stats reveal, final
   counts, scroll away/back, navigation/focus, background/resume and OS reduced
   motion. Values must settle exactly, never overshoot/replay within the same
   Home presentation, and units must not move. Changed target settles directly.
   Screen readers receive one stable final count/label, not frame announcements.
7. Record platform/device/client/version/build/source hash/API, screenshots,
   short motion proof, logs, unavailable sources and known warnings. Simulator
   proof is not physical-device performance proof. Build success is not UI or
   Store approval. Keep any unavailable native lane explicitly pending.
8. Only after team acceptance, submit the chosen builds for Store review and
   release following each Store's steps. Android and iOS need not publish at the
   same instant. No production OTA is part of this runbook.

## Rollback

Disable/revert motion independently while keeping the additive count contract
and truthful final values. Old binaries ignore the new fields. New binaries on
old payloads show static `value`; do not parse that string to create a numeric
target. If a source/query/config is wrong, correct it through a reviewed backend
PR rather than reintroducing marketing numbers. There is no DB rollback here.

## Suggested Thai release notes

แสดงสถิติ JAOTHUI จากข้อมูลจริง พร้อมปรับการแสดงตัวเลขบนหน้าหลักให้อ่านง่ายขึ้น
และรองรับการตั้งค่าลดการเคลื่อนไหวของอุปกรณ์
