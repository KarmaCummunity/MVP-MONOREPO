# CI/CD: PR validation (GitHub Actions)

## Recommendation (first step)

Add a **single PR gate workflow** that runs on every pull request (and on pushes to protected branches): install dependencies with a frozen lockfile, then **lint**, **test**, and **build**. This gives the highest leverage before Sonar, Railway tweaks, or Redis changes—without new infrastructure.

## Scope (this iteration)

- Workflow: `.github/workflows/ci.yml`
- Triggers: `pull_request`, `push` to `main` and `dev`
- Steps: `npm ci` → **`npm run lint:ci`** (ESLint for `@kc/api` only) → `npm run test` → `npm run build`
- **Why API-only lint:** `apps/mobile` currently reports hundreds of ESLint errors on `npm run lint --workspace @kc/mobile`. Until that backlog is cleared, PRs still run **mobile Jest tests** via `npm test`; only the ESLint gate is scoped to the API so CI is actionable on day one.
- `apps/dev-bot`: no automated tests yet; the workspace omits a `test` script so `npm test --workspaces --if-present` does not fail the pipeline

## Follow-ups (not in this doc’s implementation)

| Item | Notes |
|------|--------|
| Mobile ESLint in CI | Fix `@kc/mobile` lint errors, then change workflow to `npm run lint` (or `lint:ci` including mobile) |
| Coverage gates | Use `test:ci` / coverage thresholds per app when coverage is meaningful |
| Sonar or similar | Needs org project + secrets |
| Mobile native builds | Separate workflow (EAS, macOS runners) if required |
| Deploy workflows | Tag-based or environment-gated deploy after CI is stable |

## Maintainer notes

- Node version: CI uses **22.x** (current LTS line) for reproducibility and to satisfy tooling that expects newer Node; root `package.json` still allows `>=18` locally.
- If a new workspace adds a `test` script, ensure it exits 0 in CI or is excluded intentionally.
