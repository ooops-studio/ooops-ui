# Evidence archive — 22 October 2026

This directory preserves selected evidence from the completed UI work and publication. Archiving it on 22 October is **not** a new Workspace pilot run. Machine-local paths retained in the original JSON are provenance only; the files linked here are the durable copies. `sha256.json` covers all archived files other than itself.

## Published packages and immutable source

| Package | Published version | Release / source |
|---|---|---|
| `@ooopsstudio/ui-primitives` | `0.5.0` | [GitHub release](https://github.com/ooops-studio/ooops-ui/releases/tag/%40ooopsstudio/ui-primitives%400.5.0) |
| `@ooopsstudio/ui-astro` | `0.4.0` | [GitHub release](https://github.com/ooops-studio/ooops-ui/releases/tag/%40ooopsstudio/ui-astro%400.4.0) |
| `@ooopsstudio/ui-svelte` | `0.4.0` | [GitHub release](https://github.com/ooops-studio/ooops-ui/releases/tag/%40ooopsstudio/ui-svelte%400.4.0) |

All three release tags resolve to [`bccf4dc2fae7d6d84f6c3a57bcd203e14877a716`](https://github.com/ooops-studio/ooops-ui/commit/bccf4dc2fae7d6d84f6c3a57bcd203e14877a716). Implementation commit: [`4a2a3d1`](https://github.com/ooops-studio/ooops-ui/commit/4a2a3d1ffce236638d194e17096f9312d1f2df01). Publisher verification fix: [`d1f503c`](https://github.com/ooops-studio/ooops-ui/commit/d1f503c95e6678ddc36e58886bf316a4c62f8c9b).

The first publish run reported success before the new versions became visible to follow-up registry reads. The Changesets 3 output also did not match action v1's `New tag:` parser, so tags/releases were restored at the exact release commit after registry and artifact verification. The publisher fix verifies an exact registry version before announcing a release tag; its tests reject false success, auth failures and publish failures. The final run below exercised the already-published path, not another live upload through the new publisher.

[Registry and tarball verification](published-packages.json) records fresh metadata, `latest` tags, SHA-512 integrity checks and inspected exports/calendar styling from downloaded npm artifacts. It does not certify migration of Workspace dependencies.

## CI and release validation

| Evidence | Source | Preserved record |
|---|---|---|
| Final main CI, 16 successful jobs | [CI run 39673680587](https://github.com/ooops-studio/ooops-ui/actions/runs/39673680587) at `d1f503c` | [Job/step results](final-ci.json) |
| Full final release gate and safe skip of already published packages | [Release run 39673680573](https://github.com/ooops-studio/ooops-ui/actions/runs/39673680573) at `d1f503c` | [Job/step results](final-release.json), [selected log lines](final-release-summary.log.txt) |
| Actual three-package publish | [Release run 39670403100](https://github.com/ooops-studio/ooops-ui/actions/runs/39670403100) at `bccf4dc` | [Selected publication/validation lines](publication-summary.log.txt) |

The full gate passed 156 package unit tests, the maintainer/tooling checks, unchanged per-file coverage thresholds, builds/types/lint, audits, package size/dependency checks and packed consumers. Browser coverage includes 228 executions in Chromium/Firefox/WebKit, 10 visual checks and two applicable 100-cycle stress tests. Two non-applicable adapter/project stress crossings are intentional skips. The execution gate adds 54 tests covering 115 asserted branch/adapter cases for 16 features, without retries. The publisher fix adds six assertions-bearing test/subtest results to the previous two release-toolchain tests (eight total).

Run pages identify the exact source and are the canonical remote evidence. CI artifacts have a seven-day retention policy; links to those artifacts or machine-local `reports/` are not treated as permanent storage. This archive contains selected summaries, not every browser trace, SQL attachment or full runner log.

## Rendered calendar fixtures

[Astro mobile](screenshots/calendar-astro-mobile.png) and [Svelte mobile](screenshots/calendar-svelte-mobile.png) preserve the consumer-themed calendar with month/year controls in the first row and no duplicated visible heading. They are historical Chromium fixture captures at 393×852, not screenshots of a migrated production Workspace. Cross-browser assertions and the published source are covered separately above. These screenshots are not a newly approved visual baseline.

## Earlier real Workspace pilot

The pilot used Button/IconButton candidates in an isolated worktree containing the current Workspace source snapshot plus an isolated native-form consumer fix. It passed four Settings/Form desktop/mobile Chromium scenarios. It did **not** run the later published `0.4.0` packages, migrate primary Workspace wrappers or verify Calendar/Drawer inside real Workspace screens.

- [Original four-test summary](workspace-pilot-summary.json).
- [Base commit, snapshot time and source hashes](workspace-source-snapshot.json); the source is dirty-snapshot evidence, not a reproducible committed Workspace release.
- [Form desktop](screenshots/form-desktop.png) / [Form mobile](screenshots/form-mobile.png).
- [Settings desktop](screenshots/settings-desktop.png) / [Settings mobile](screenshots/settings-mobile.png).

The images are preserved unmodified, including any transient animation state. They supplement the behavioral/SQL assertions summarized by the original pilot; they do not prove pixel-perfect layout or replace the runner's assertions. The Form `name`/`required` consumer defect was reproduced with original wrappers and corrected only in the pilot. That patch was not applied to primary Workspace by this UI task.

VoiceOver and NVDA were explicitly excluded by the user. No screen-reader pass or certification is claimed.

## Recheck

For each published version, run `npm view @ooopsstudio/<package>@<version> version dist.integrity dist.tarball --json --prefer-online` and `npm pack @ooopsstudio/<package>@<version>` in a temporary directory. Compare metadata/integrity to `published-packages.json`; inspect the actual tarball for exports rather than relying on a manifest alone. `git ls-remote --tags origin` checks the annotated release tag targets. Verify local archive checksums using `sha256.json`. A later npm `latest` tag can legitimately change; this file records the 22 October verification snapshot.
