# KC Monorepo

Karma Community monorepo containing multiple apps:

- `apps/api` — NestJS backend (Postgres + Redis required; not started in Replit)
- `apps/mobile` — Expo / React Native app (run as Expo Web for the Replit preview)
- `apps/dev-bot` — CLI/bot helper
- `packages/shared-types` — Shared TypeScript types used by api + mobile
- `packages/config-eslint` — Shared ESLint config

## Replit setup

The Replit preview runs the **Expo Web** version of `apps/mobile` on port 5000.

- Workflow: `Start application` runs `npm run web --workspace @kc/mobile -- --port 5000 --host lan`
- Metro bundler binds `0.0.0.0:5000`; the Replit proxy serves it via the iframe preview.
- The shared types package must be built once before first start (`cd packages/shared-types && npm run build`). It outputs `dist/index.js` which the mobile app imports.

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
