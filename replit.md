# KC Monorepo

Karma Community monorepo containing multiple apps:

- `apps/api` — NestJS backend (Postgres + Redis required; not started in Replit)
- `apps/mobile` — Expo / React Native app (run as Expo Web for the Replit preview)
- `apps/dev-bot` — CLI/bot helper
- `packages/shared-types` — Shared TypeScript types used by api + mobile
- `packages/config-eslint` — Shared ESLint config

## Replit setup

The Replit preview runs a **static export** of the Expo Web `apps/mobile` build on port 5000 (Metro dev server is too memory-heavy for the proxy/iframe).

- Workflow: `Start application` frees port 5000, runs `npx expo export --platform web` (only if `dist/` is missing) and serves the result with `npx serve -s dist -l tcp://0.0.0.0:5000 --no-clipboard`.
- The shared types package must be built once before the first export (`npm run build --workspace @kc/shared-types`); it outputs `dist/index.js` which the mobile app imports.

### Important: React / react-dom version pin

The mobile workspace transitively pulls `react-dom@19.0.0` while `react@19.2.4` is installed at the workspace level. This mismatch causes React error #527 ("Incompatible React versions") at runtime and makes the page render blank with no visible UI.

To fix it, both of these are pinned in `apps/mobile/package.json`:

```jsonc
"dependencies": { "react-dom": "19.2.4" },
"overrides":   { "react-dom": "19.2.4" }
```

The override is required to defeat a peer-dep resolution that would otherwise nest `react-dom@19.0.0` under `apps/mobile/node_modules/react-dom`. After changing this you must rebuild: `rm -rf apps/mobile/dist && cd apps/mobile && npx expo export --platform web`.

## Why only mobile web?

`apps/api` requires `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, and a 32+ char `JWT_SECRET` (it exits at startup if any are missing). Those external services aren't provisioned here, so the API isn't started by default. To enable it locally, provide those env vars and add a workflow such as `npm run dev:api` on a backend port (e.g. 3001).

## Deployment

Configured as a **static** publish:

- Build: `cd packages/shared-types && npm run build && cd ../../apps/mobile && npx expo export --platform web`
- Public dir: `apps/mobile/dist`

This produces a static web export of the mobile app. Note the build hardcodes the production API URL (`https://kc-mvp-server-production.up.railway.app`) per the `build:web` script in `apps/mobile/package.json`.

## Useful commands

```bash
# install deps for the mobile workspace
npm install --workspace=@kc/mobile --include-workspace-root

# build shared types (run once after install / when types change)
npm run build --workspace @kc/shared-types

# run mobile web dev server on port 5000
npm run web --workspace @kc/mobile -- --port 5000 --host lan

# run the API (requires Postgres, Redis, JWT_SECRET, GOOGLE_CLIENT_ID)
npm run dev:api
```
