# KC Monorepo

Karma Community monorepo containing multiple apps:

- `apps/api` — NestJS backend (Postgres + Redis required; not started in Replit)
- `apps/mobile` — Expo / React Native app (run as Expo Web for the Replit preview)
- `apps/dev-bot` — CLI/bot helper
- `packages/shared-types` — Shared TypeScript types used by api + mobile
- `packages/config-eslint` — Shared ESLint config

## Replit setup

The Replit preview runs a **static export** of the Expo Web `apps/mobile` build on port 5000
(Metro dev server is too memory-heavy for the proxy/iframe).

- **Workflow**: `Start application` kills any process on port 5000, runs `npx expo export --platform web`
  (only if `dist/` is missing) then serves the result with `npx serve` from `apps/mobile/node_modules/.bin/serve`
  (installed as a local dep to avoid the interactive `y/n` prompt that blocks the workflow).

```
bash -c 'fuser -k 5000/tcp 2>/dev/null; sleep 1; cd apps/mobile && (test -f dist/index.html || npx expo export --platform web) && npx serve -s dist -l tcp://0.0.0.0:5000 --no-clipboard'
```

---

## Important: React / react-dom version pin

The monorepo root `node_modules/react` resolves to **19.2.4** (hoisted from another workspace).
`apps/mobile` (from the `dev` branch) specifies `react@19.0.0`, which npm satisfies by
placing a **separate** `apps/mobile/node_modules/react@19.0.0` alongside root's 19.2.4.
Metro bundles both instances, making `useContext` resolve to `null` inside `react-i18next`
at runtime → the app crashes with a white screen.

### Fix applied

1. **Root `package.json` overrides** (the only level npm actually honours in a workspace):
   ```jsonc
   "overrides": {
     "react":     "19.2.4",
     "react-dom": "19.2.4"
   }
   ```
2. **`apps/mobile/package.json`** dependencies *and* overrides both set to `19.2.4`.
3. **`package-lock.json`** workspace entries `apps/mobile/node_modules/react` and
   `apps/mobile/node_modules/react-dom` manually updated to `19.2.4` (npm won't re-resolve
   stale lockfile entries without a full re-lock).

After any `npm install` that might downgrade these, verify:
```bash
cat apps/mobile/node_modules/react/package.json | grep version
# should be absent (deduped to root) or show 19.2.4
cat apps/mobile/node_modules/react-dom/package.json | grep version
# must show 19.2.4
```

If wrong, run:
```bash
npm install --no-audit --no-fund --ignore-scripts
rm -rf apps/mobile/dist && cd apps/mobile && npx expo export --platform web --clear
```

---

## Home-tab white screen fix (navigation)

Root cause: `MainNavigator.tsx` had an `if (isLoading) return <LoadingSpinner>` gate.
Firebase periodically refreshes auth tokens, which caused `userStore.isLoading` to flip
`true → false` briefly. Every time that happened, the entire navigator tree unmounted
and remounted, flashing a white Home screen.

Three-part fix applied to the navigation layer:

### `apps/mobile/navigations/MainNavigator.tsx`
- **Removed** the `isLoading` early-return gate entirely.
- The navigator now renders unconditionally once mounted; Firebase loading state is handled
  at the `App.tsx` level (before the navigator is even mounted).
- `stackKey` is now stable (derived from auth state, not loading state) so the navigator
  never re-instantiates on token refresh.
- Full JSDoc added explaining the design intent.

### `apps/mobile/navigations/HomeTabStack.tsx`
- **Removed** `keepScreensMounted` and `detachInactiveScreens={false}` (mobile-web
  workarounds that caused all screens to re-render simultaneously during parent remounts).
- Always uses `detachInactiveScreens={true}` — correct and performant on all platforms.
- Full JSDoc added.

### `apps/mobile/navigations/BottomNavigator.tsx`
- **Removed** `refreshUserRoles()` from `useFocusEffect`. Calling it on every tab-bar
  focus triggered re-renders that — combined with the (now-removed) loading gate —
  compounded the white-screen flash. Roles are refreshed internally by `userStore` on
  login / token refresh and do not need a navigator-level poll.
- Removed stale `'use strict'` directive and TODO dump at top of file.
- Replaced with a comprehensive file-header JSDoc covering: tab order, role-refresh
  strategy, tab re-press behaviour, and tab-bar positioning logic.
- Unused `refreshUserRoles` and `isAuthenticated` destructures removed from `useUser()`.

---

## Running on a real device (Expo Go)

A second workflow **`Expo dev server (tunnel)`** runs:
```
cd apps/mobile && npx expo start --tunnel --port 8080
```
so a phone on any network can connect to the dev bundler through an ngrok tunnel.
The tunnel URL changes each restart and is printed in the workflow logs as
`https://<random>-anonymous-8080.exp.direct`.

To open in Expo Go, scan the QR code shown in the workflow console
(`exp://<random>-anonymous-8080.exp.direct`).

> The `--go` flag crashes with `Cannot read properties of undefined (reading 'body')` inside
> ngrok on this setup — omit it. The workflow starts in dev-build mode, which is fine because
> `expo-dev-client` is a listed dependency but not registered as a plugin, so Expo Go can
> still load the bundle.

`@expo/ngrok` is a devDependency of `apps/mobile`; reinstall after wiping `node_modules`.

---

## Why only mobile web?

`apps/api` requires `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, and a 32+ char
`JWT_SECRET` (it exits at startup if any are missing). Those external services aren't
provisioned here, so the API isn't started by default.

---

## Deployment

Configured as a **static** publish:

- **Build**: `cd packages/shared-types && npm run build && cd ../../apps/mobile && npx expo export --platform web`
- **Public dir**: `apps/mobile/dist`

The build hardcodes the production API URL (`https://kc-mvp-server-production.up.railway.app`)
per the `build:web` script in `apps/mobile/package.json`.

---

## Useful commands

```bash
# install all workspace deps (root + all workspaces)
npm install --no-audit --no-fund --ignore-scripts

# install serve locally (avoids interactive prompt in workflow)
npm install serve --workspace=@kc/mobile --no-audit --no-fund --ignore-scripts

# build shared types (run once after install / when types change)
npm run build --workspace @kc/shared-types

# rebuild static web export (clears Metro cache)
rm -rf apps/mobile/dist
cd apps/mobile && npx expo export --platform web --clear

# run mobile web dev server on port 5000
npm run web --workspace @kc/mobile -- --port 5000 --host lan

# run the API (requires Postgres, Redis, JWT_SECRET, GOOGLE_CLIENT_ID)
npm run dev:api
```
