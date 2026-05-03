> **SRS shard:** `SRS/functional/02-10-statistics.md` — part of [SRS index](../README.md). References § refer to the full document.
>
> **Dashboard post counts (as-built):** see [Posts: visibility, workflow, anonymity, and statistics](../../reference/posts-visibility-workflow-and-stats.md) §5 for definitions of `posts_total`, `posts_open`, and `posts_closed` on `GET /api/stats/dashboard`.

### 2.10 Statistics Module (`modules/stats`)

#### 2.10.1 Community Statistics

- **Description:** Platform-wide analytics and metrics
- **Controller prefix:** `/api/stats`
- **Endpoints:**
  - `GET /api/stats/community` — community stats overview
  - `GET /api/stats/community/version` — stats version (for cache invalidation)
  - `GET /api/stats/community/trends` — time-series trends
  - `GET /api/stats/community/cities` — city-based statistics
  - `POST /api/stats/track-visit' — track site visits
  - `POST /api/stats/increment` — increment stat (requires `JwtAuthGuard`)
  - `GET /api/stats/dashboard` — admin dashboard stats
  - `GET /api/stats/real-time` — real-time metrics (HTTP polling, not WebSocket)
  - `POST /api/stats/community/reset` — reset stats (requires `AdminAuthGuard`)
- **Architecture:** Facade pattern with four services:
  - `StatsQueriesService` — raw SQL metrics
  - `StatsMapperService` — DB rows → API response shapes
  - `ComputedStatsService` — derived/computed statistics
  - `StatsFacadeService` — orchestrates all three + Redis caching
- **Caching:** Redis-based with pattern keys (`community_stats_*`, `dashboard_stats`, `real_time_stats`, etc.)