# kc-monorepo

Monorepo for all KC projects:

- `apps/api` — NestJS server (formerly `KC-MVP-server`)
- `apps/mobile` — Expo / React Native app (formerly `MVP`)
- `docs` — documentation

## Documentation (SSOT)

Operational Markdown, SRS, and code-quality docs live under **`docs/SSOT/`** — see [docs/SSOT/README.md](docs/SSOT/README.md).

## Install

```bash
cd kc-monorepo
npm install
```

## Run

- API (development):

```bash
npm run dev:api
```

- Mobile (Expo):

```bash
npm run dev:mobile
```

## Layout

```text
kc-monorepo/
  apps/
    api/        # KC-MVP-server
    mobile/     # MVP
  packages/     # shared code and configs (future)
  docs/         # documentation
  tools/quality/
    sonar/      # Sonar analysis scripts (input under data/, output under out/)
    snyk/       # Snyk reports (JSON)
```
