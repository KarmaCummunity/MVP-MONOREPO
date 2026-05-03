# Snyk local scan — summary (2026-05-03)

## Artifacts in this folder

| File | Description |
|------|-------------|
| `snyk-scan-console.log` | Full console output: `snyk test --all-projects`, `snyk code test` |
| `snyk-oss.json` | Open Source / dependency test (first run) |
| `snyk-oss-after.json` | OSS test after dependency fixes (if present) |
| `snyk-code.json` | Snyk Code SARIF/JSON (first run) |

**Container:** Full `snyk container test` for Dockerfiles was started but can take a long time (image pull + analysis). To capture results locally, from repo root run:

```bash
snyk container test node:20 --file=apps/api/Dockerfile --json-file-output=snyk-local-results/snyk-container-api.json
snyk container test node:20-alpine --file=apps/mobile/Dockerfile --json-file-output=snyk-local-results/snyk-container-mobile-build.json
snyk container test nginx:1.30.0-alpine --file=apps/mobile/Dockerfile --json-file-output=snyk-local-results/snyk-container-mobile-nginx.json
```

## What we fixed in the repo (dependencies + tooling)

- **@kc/api:** `@nestjs/config` ^4.0.4; Snyk OSS for API now **clean** (no vulnerable paths).
- **Monorepo:** `lodash` ^4.18.1, `picomatch` ^3.0.2; **direct** `devDependencies` `follow-redirects@1.16.0` and `protobufjs@7.5.5` to dedupe and address axios / Firebase / gRPC chains.
- **Sonar script:** `tools/quality/sonar/fetch-and-build-priority-doc.mjs` — removed hardcoded Sonar project keys; set `SONAR_PROJECT_KEY_API` and `SONAR_PROJECT_KEY_MOBILE` (same values as `sonar.projectKey` in `apps/api/sonar-project.properties` and `apps/mobile/sonar-project.properties`).

## What remains (Snyk OSS)

- **Root `package.json` and `apps/mobile`:** Transitive issues from **Expo 53 / React Native 0.79** (e.g. `minimatch` / `brace-expansion` / `inflight` in the Metro / glob chain). Snyk’s suggested fix is a **major** stack upgrade (e.g. Expo 55, RN 0.85) — plan that as a separate release, not a quick patch.
- **inflight:** Snyk reports no fix via upgrade for the `expo` → `@expo/cli` dev chain; only acceptable mitigations are upgrade when upstream removes it or accept risk until then.

## Snyk Code (SAST)

- A **root `.snyk`** was added with `exclude: code` entries documenting the same false-positive handling as `apps/api/.snyk` and `apps/mobile/.snyk`. In this CLI version, **“Ignored issues” may still show 0** for `snyk code test` from the repo root; subfolder policies may behave differently. For CI parity with the Snyk UI, use [Snyk’s Code ignore workflow in the app](https://docs.snyk.io/) or split scans per app with explicit paths.

## Commands to repeat the scan

```bash
cd /path/to/kc-monorepo
snyk test --all-projects --json-file-output=snyk-local-results/snyk-oss.json | tee snyk-local-results/oss.txt
snyk code test --json-file-output=snyk-local-results/snyk-code.json | tee snyk-local-results/code.txt
```
