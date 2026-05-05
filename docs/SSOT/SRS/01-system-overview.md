> **SRS shard:** `SRS/01-system-overview.md` — part of [SRS index](README.md). References § refer to the full document.

## 1. System Overview

### 1.1 System Purpose

Karma Community (KC) is a **community-oriented social platform** designed to facilitate volunteering, donations, ride-sharing, community challenges, and social interactions. The platform enables community members to contribute through multiple avenues — donating goods/money/time/knowledge, offering rides, participating in personal and group challenges, and engaging through a social feed with posts, likes, and comments. KC also provides an **operator-assisted matching** capability ("Shiduchim Tov" / Good Matching) where trained call-center operators review high-privacy requests and manually pair community needs with suitable volunteers or donors (see §2.14 and §2.15).

### 1.2 Target Users

- **Community members** — individuals who donate, volunteer, request help, or participate in community activities
- **Volunteers** — active community contributors (base volunteer role)
- **Volunteer managers** — volunteers who supervise other volunteers in a reporting tree (see §2.2.5)
- **Organization-affiliated volunteers** — volunteers linked to a specific organization (see §2.2.5)
- **Operators (callers)** — call-center brokers who triage high-privacy posts, review needs and capabilities, and manually propose matches between requesters and volunteers/donors (see §2.14). This is a **new persona** requiring the `operator` role (`OperatorAuthGuard` + mobile `useOperatorProtection` / `isOperator` are implemented — full module, DB, and screens still pending — see §10.1)
- **Organization administrators** — manage organizations within the community
- **System administrators** — full platform management, user promotion, CRM, task management

### 1.3 Core Capabilities

- **User authentication** — email/password, Google OAuth, Sign in with Apple (iOS, required with Google per App Store), Firebase Auth, guest mode
- **Donations management** — money, items, time, knowledge across 30+ categories
- **Ride-sharing** — offer and book community rides
- **Social feed** — posts (multiple types), likes, comments, hide/unhide, reels view; **filtering and sorting** of feed content (see §2.5.6)
- **Post anonymity levels** — per-post privacy control allowing authors to choose from four graduated visibility levels: operators only, operators + followers, public limited, and fully public (see §2.5.7)
- **Operator matching ("Shiduchim Tov")** — human-in-the-loop call-center workflow where operators review anonymized requests and manually propose volunteer/donor matches (see §2.14, §2.15)
- **Chat** — real-time messaging with conversations, read receipts, reactions
- **Personal challenges (timers)** — habit tracking with streaks, resets, records
- **Community group challenges** — shared goals with entries, participants, leaderboards
- **Items delivery** — item listing, reservation, delivery requests
- **Notifications** — push (Expo), local, polling-based notification system
- **User hierarchy** — manager trees, role-based access (`user`, `volunteer`, `volunteer_manager`, `operator`, `admin`, `org_admin`, `super_admin`) plus **organization-linked volunteers** (see §2.2.5)
- **Profile experience** — **personalized profile screen presentation** (layout, visibility, and emphasis adapted per role and preferences — see §2.2.6)
- **Admin panel** — dynamic tables, CRM, task management, file management, time tracking
- **Community statistics** — dashboard, real-time metrics, city-based stats, trends
- **Follow system** — follow/unfollow users, followers/following lists, discover people
- **Organizational support** — organization creation, applications, approval workflows
- **Multi-language** — Hebrew (default) and English, full RTL support
- **Landing website** — web mode for public-facing site vs. authenticated app

### 1.4 High-Level Architecture``
┌──────────────────────────────────────────────────────┐
│                    Clients                            │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │ Mobile App  │  │  Web App    │                    │
│  │ (Expo/RN)   │  │ (Expo Web)  │                    │
│  └──────┬──────┘  └──────┬──────┘                    │
└─────────┼────────────────┼──────────────────────────┘
          │                │
          ▼                ▼
┌──────────────────────────────────────────────────────┐
│              NestJS API Server (:3001)                │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────────────┐  │
│  │  Auth  │ │ Users  │ │Posts │ │  Donations/    │  │
│  │Module  │ │Module  │ │Module│ │  Rides/Items   │  │
│  ├────────┤ ├────────┤ ├──────┤ ├────────────────┤  │
│  │ Stats  │ │ Chat   │ │Admin │ │  Challenges    │  │
│  │Module  │ │Module  │ │Module│ │  Module        │  │
│  ├────────┤ ├────────┤ ├──────┤ ├────────────────┤  │
│  │Operator│ │        │ │      │ │                │  │
│  │Matching│ │        │ │      │ │                │  │
│  │Module  │ │        │ │      │ │                │  │
│  └────────┘ └────────┘ └──────┘ └────────────────┘  │
└───────────┬──────────────────────┬───────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL 15  │    │    Redis 7       │
│   (Primary DB)   │    │   (Cache/Auth)   │
└──────────────────┘    └──────────────────┘
```

**Monorepo structure (npm workspaces):**

| Workspace | Path | Description |
|-----------|------|-------------|
| `@kc/api` | `apps/api` | NestJS backend server |
| `@kc/mobile` | `apps/mobile` | Expo/React Native mobile + web app |
| `@kc/shared-types` | `packages/shared-types` | Shared TypeScript types (API contract) |
| `@kc/config-eslint` | `packages/config-eslint` | Shared ESLint configuration |

**Deployment:** Railway (API + Mobile web export via Docker)

---

