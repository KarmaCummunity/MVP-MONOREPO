# KC Vision Web — SRS traceability

Vision prototype only — **no backend**. Maps UI routes to SRS functional shards (`docs/SSOT/SRS/functional/`).

| SRS § | Module | SRS file | Routes / screens | Status |
|-------|--------|----------|------------------|--------|
| 2.1 | Authentication | `02-01-authentication.md` | `/login`, `/register` | Interactive mock |
| 2.2 | Users | `02-02-users.md` | `/profile`, `/user/:userId`, `/discover`, `/hierarchy` | Interactive mock |
| 2.3 | Donations | `02-03-donations.md` | `/donations`, `/donations/category/:slug`, `/donations/knowledge` | Interactive mock |
| 2.4 | Rides | `02-04-rides.md` | `/rides`, `/rides/:rideId` | Interactive mock |
| 2.5 | Posts | `02-05-posts.md` | `/feed`, `/posts/new` | Interactive mock |
| 2.6 | Items | `02-06-items.md` | `/items`, `/items/:itemId` | Interactive mock |
| 2.7 | Chat | `02-07-chat.md` | `/chat`, `/chat/:conversationId` | Interactive mock |
| 2.8 | Challenges | `02-08-challenges.md` | `/challenges` | Interactive mock |
| 2.9 | Notifications | `02-09-notifications.md` | `/notifications` | Interactive mock |
| 2.10 | Statistics | `02-10-statistics.md` | `/statistics` | Interactive mock |
| 2.11 | Admin | `02-11-admin.md` | `/admin` | Interactive mock |
| 2.12 | Sync | `02-12-sync.md` | `/sync` | Interactive mock |
| 2.13 | Shared | `02-13-shared.md` | Layout, `EmptyState`, `Modal`, `Tabs`, `ErrorBoundary`, banner | Shell + components |
| 2.14 | Operator matching | `02-14-operator-matching.md` | `/donations/shiduchim-tov/queue`, `/donations/shiduchim-tov/cases/*` | Interactive mock |
| 2.15 | Shiduchim Tov workspace | `02-15-shiduchim-tov-workspace.md` | `/donations/shiduchim-tov` (explainer vs workspace) | Interactive mock |

**Personas:** Header dropdown — guest + seven SRS-aligned roles (§1.2); persisted in `localStorage`.

**Data:** `src/fixtures/` + Zustand stores (`src/store/`).
