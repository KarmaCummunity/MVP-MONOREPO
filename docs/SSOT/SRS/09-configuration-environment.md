> **SRS shard:** `SRS/09-configuration-environment.md` — part of [SRS index](README.md). References § refer to the full document.

## 9. Configuration & Environment

### 9.1 Environment Variables

#### API (`apps/api/.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|------------|
| `PORT` | No | `3001` | Server port |
| `ENVIRONMENT` | Yes | ``production'' | Environment identifier |
| `NODE_ENV` | Yes | ``production'' | Node.js environment |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `JWT_SECRET` | **Yes** | — | HMAC signing key (min 32 chars) |
| `DATABASE_URL` | **Yes*** | — | PostgreSQL connection string |
| `POSTGRES_HOST` | Alt* | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | Alt* | `5435` | PostgreSQL port |
| `POSTGRES_USER` | Alt* | `kc` | PostgreSQL user
| `POSTGRES_PASSWORD` | Alt* | — | PostgreSQL password |
| `POSTGRES_DB` | Alt* | `kc_db` | PostgreSQL database
| `PG_SSL` / `POSTGRES_SSL` / `PGSSLMODE` | No | — | SSL configuration |
| `REDIS_URL` | **Yes*** | — | Redis connection string |
| `REDIS_HOST` / `REDIS_PORT` | Alt* | — | Redis host/port |
| `REDIS_TLS` / `REDIS_SSL` | No | `false` | Redis TLS |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | No | — | Fallback for `GOOGLE_CLIENT_ID` |
| `GOOGLE_API_KEY` | No | — | Google Places API key |
| `FIREBASE_SERVICE_ACCOUNT` | No | — | Base64-encoded service account JSON |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | No | — | JSON string service account |
| `ROOT_ADMIN_EMAIL` | **Yes** | — | Bootstrap super_admin email |
| `FORCE_FULL_SCHEMA` | No | `false` | Force schema rebuild |
| `SKIP_FULL_SCHEMA` | No | `0` | Skip schema init |
| `SNYK_TOKEN` | No | — | Snyk API token for quality gate |
| **`OPERATOR_NOTIFICATION_ENABLED`** | No | `true` | **NEW:** Enable/disable push notifications to operators when new queue items arrive (§2.14.5). Useful for staging environments where operator notifications are not desired. |
| **`OPERATOR_QUEUE_POLL_INTERVAL_MS`** | No | `10000` | **NEW:** Suggested polling interval (ms) returned to operator clients for queue refresh. Server hint only — client enforces actual interval. |

*Either `DATABASE_URL` or individual `POSTGRES_*` vars required. Same for Redis.

#### Mobile (`apps/mobile/.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|------------|
| `EXPO_PUBLIC_ENVIRONMENT` | Yes | ``development'' | Environment |
| `EXPO_PUBLIC_API_BASE_URL` | Yes | `http://localhost:3001` | API URL |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_APP_ID` ​​| Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | — | Firebase Analytics |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Yes | — | Google OAuth (Android) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes | — | Google OAuth (Web) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Yes | — | Google OAuth (iOS) |
| `EXPO_PUBLIC_USE_BACKEND` | No | `1` | Use REST backend |
| `EXPO_PUBLIC_USE_FIRESTORE` | No | `0` | Use Firestore directly
| `EXPO_PUBLIC_ADMIN_EMAILS` | No | — | Comma-separated admin emails |

### 9.2 Deployment

**Platform:** Railway

**API deployment:**
- Docker build (`node:20`)
- `npm ci --include=dev` → `npm run build` (tsc) → `npm prune --production`
- Schema SQL copied to `dist/database/`
- Start: `node dist/main.js`
- Health check: `GET /health' (timeout 300s)
- Restart policy: on failure, max 10 retries

**Mobile web deployment:**
- Docker multi-stage: Expo web export → nginx static serving
- Alternative: `Dockerfile.static` for pre-built static files

**Local development:**
- Docker Compose: PostgreSQL 15 (port 5435), Redis 7 (port 6379)
- API: `npm run dev:api` (NestJS watch mode)
- Mobile: `npm run dev:mobile` (Expo start)

### 9.3 Build Tools and Pipelines

**CI/CD (GitHub Actions):**rigger | Steps |
|----------|---------|-------|
| `quality-gate.yml` | Push to `dev`/`main` + PR on `apps/api/**` | ESLint (changed files), tests (`npm run test:ci`), SonarCloud scan, Snyk (optional), quality gate API check |
| `pr-quality-check.yml` | PR on `apps/api/**` | ESLint, tests, SonarCloud, Snyk, PR comment with results |
| `sonar.yml` | Push/PR on `apps/api/**` | Tests + SonarCloud scan |

**Pre-push hook (`.husky/pre-push`):**
- Detects changed files in `apps/api/`
- Runs `check-quality-gate.sh` (ESLint + tests)
- Optional Sonar pre-push check (if `SONAR_TOKEN` set)

**Build toolchain:**
- TypeScript (target ES2019, CommonJS modules)
- ts-jest for testing
- ESLint with shared config (`@kc/config-eslint`)
- Prettier for formatting

---

