> **SRS shard:** `SRS/functional/02-13-shared.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.13 Shared Module (`shared`)

#### 2.13.1 Health Checks

- **Endpoints:**
  - `GET /` — server root
  - `GET /health' — health check
  - `GET /health/redis` — Redis health check

#### 2.13.2 Google Places

- **Endpoints:**
  - `GET /autocomplete` — place autocomplete (Google Places API)
  - `GET /place-details` — place details
  - `GET /search-stats` — search statistics

#### 2.13.3 Rate Limiting (Development/Test)

- **Controller prefix:** `/rate-limit`
- **Endpoints for testing rate limit behavior:**
  - `POST /rate-limit/test`, `POST /rate-limit/stress-test`, `GET /rate-limit/status`, `DELETE /rate-limit/clear`, `GET /rate-limit/rules`, `GET /rate-limit/stats`, `POST /rate-limit/custom`, `POST /rate-limit/simulate/:endpoint`

#### 2.13.4 Redis Test (Non-Production Only)

- **Controller prefix:** `/redis-test`
- **Condition:** Registered only when `NODE_ENV !== "production"`
- **Endpoints:** `GET /redis-test/info`, `POST /redis-test/set`, `GET /redis-test/get/:key`, `DELETE /redis-test/delete/:key`, `GET /redis-test/keys`, `POST /redis-test/increment/:key`, `POST /redis-test/comprehensive`