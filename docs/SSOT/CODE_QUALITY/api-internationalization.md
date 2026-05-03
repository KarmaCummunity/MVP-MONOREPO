# API internationalization and locale alignment

**Status:** Target architecture (implementation phased)  
**Scope:** `@kc/api` (NestJS), coordination with `@kc/mobile`  
**Related SRS:** [§4 Frontend Architecture](../SRS/04-frontend-architecture.md) (client i18n), [§5 Backend Architecture](../SRS/05-backend-architecture.md), [§2.2 Users](../SRS/functional/02-02-users.md) (user settings)

---

## 1. Purpose

The mobile app uses **i18next** with **Hebrew (`he`)** as the default UI language and **English (`en`)** as fallback (`apps/mobile/app/i18n.ts`, `apps/mobile/locales/`). User-facing strings returned by the API today are largely **hard-coded in Hebrew**, which breaks consistency when the client runs in English and complicates long-term maintenance.

This document defines how the **API SHALL** resolve locale and emit user-facing messages so they **align with the active client language**, without exposing raw stack traces or leaking internal details (see [constraints.md](constraints.md)).

---

## 2. Goals

| Goal | Description |
|------|-------------|
| **G1** | HTTP responses that include human-readable errors or notices use the **resolved request locale** (`he` or `en`). |
| **G2** | Locale resolution is **deterministic**, documented, and testable. |
| **G3** | **Async** work (push notifications, background jobs, emails) uses the **recipient’s** stored preference, not only `Accept-Language` from an unrelated request. |
| **G4** | Translation keys and English source strings remain **maintainable** (structured JSON, stable keys). |
| **G5** | Migration can be **incremental** by domain (e.g. hierarchy errors first), without a single big-bang rewrite. |

Non-goals for the initial rollout:

- Translating **domain data** stored in the database (e.g. user-generated content, challenge titles in seed SQL) unless explicitly required by product.
- Supporting more than **`he`** and **`en`** until product mandates it.

---

## 3. Supported locales

| Code | Description |
|------|-------------|
| `he` | Primary product locale (default when resolution yields nothing usable). |
| `en` | Secondary locale. |

Any other language tag from `Accept-Language` SHOULD be mapped to `en` or to the configured default (`he`) per product decision—record the chosen rule in implementation and keep it consistent across services.

---

## 4. Locale resolution (HTTP)

Resolution order (recommended default; adjust only with PM/architecture sign-off):

1. **`Accept-Language` HTTP header** — parse the first matching supported language (standard quality values optional).
2. **Authenticated user profile** — if the user record exposes a persisted preference (e.g. `settings.language` aligned with mobile `app_language`), use it when the header is **absent** or specifies an unsupported tag.
3. **Default:** `he`.

**Client obligation:** The mobile HTTP client SHOULD send `Accept-Language` on every API call, normalized to `he` or `en`, derived from the current `i18n.language` (see SRS §4 — Axios via `apiService`).

**Conflict policy:** If both header and profile differ, the recommended rule is: **`Accept-Language` wins** for that HTTP request (explicit user/session intent for this call), while profile remains the source for async delivery. Document any deviation in SRS §10 if product chooses otherwise.

---

## 5. NestJS implementation outline

| Concern | Recommendation |
|---------|------------------|
| **Framework** | Use a maintained i18n approach for NestJS (e.g. `nestjs-i18n` or equivalent) with JSON translation files per locale. |
| **Layout** | Keep translation files under `apps/api/src/i18n/` (or `apps/api/locales/`), with namespaces mirroring domains: `errors`, `notifications`, `validation`, etc. |
| **Keys** | Stable dot-separated keys in English: e.g. `errors.hierarchy.manager_cycle`. Values are locale-specific strings with interpolation placeholders (`{{managerName}}`). |
| **Injection** | Provide a **request-scoped** locale or translation helper available to services/controllers that format user-visible strings. |
| **Validation** | Replace hard-coded `class-validator` messages with keyed translations or a thin mapper from constraint metadata to i18n keys. |

Infrastructure services that do not touch user-visible text need not depend on i18n.

---

## 6. Error payloads: messages vs. codes

**Recommended shape** for JSON error responses (exact envelope MUST match existing API conventions—evolve via versioning if needed):

- **`message`** (or existing `error` field): localized string for immediate display.
- **`errorCode`** (optional, additive): stable machine identifier, e.g. `HIERARCHY_MANAGER_CYCLE`.

Clients MAY map `errorCode` through their own `i18next` namespaces for richer copy; if absent or unknown, they fall back to `message`. This supports gradual adoption without breaking screens that already display `res.error`.

---

## 7. Async flows and notifications

For push notifications, email, or queued jobs:

- Load **recipient locale** from persisted user settings (or sensible default).
- Do **not** rely on `Accept-Language` from the request that triggered the job unless that request is guaranteed to be on behalf of the same recipient.

When the user changes language in the app, the client SHOULD persist the preference to the server (e.g. profile `settings.language`) so downstream notifications stay aligned.

---

## 8. Shared translation assets (monorepo)

**Option A — Independent JSON in API and mobile:** Duplicate keys manually; simplest short-term, higher drift risk.

**Option B — Shared package:** Introduce `packages/i18n-contract/` (or similar) exporting JSON or TS objects consumed by both API and mobile for **API-emitted** strings only. Use when duplication cost outweighs package overhead.

Record the chosen option in this document when implemented.

---

## 9. Phased rollout

| Phase | Deliverable |
|-------|-------------|
| **P1** | Global i18n module; locale resolver; mobile sends `Accept-Language`; default `he`. |
| **P2** | Migrate high-visibility API errors (e.g. user hierarchy, admin flows surfaced in `Alert.alert`). |
| **P3** | Sync `settings.language` on language change from mobile settings. |
| **P4** | Notification and task/post templates in controllers/services. |
| **P5** | DTO validation messages; optional `errorCode` on responses; audit remaining Hebrew literals. |

---

## 10. Testing

- **Unit tests:** locale resolver (header only, profile only, unsupported tags, default).
- **Unit/integration:** representative translated strings for both locales for critical paths (hierarchy, auth errors).
- Do not snapshot stack traces; assert on **key**, **code**, or **stable substring** where appropriate.

---

## 11. Compliance with existing SSOT

- **SRS precedence:** If behavior conflicts with functional requirements, update [SRS §10](../SRS/10-gaps-and-assumptions.md) and reconcile this document.
- **Error handling:** Follow [constraints.md](constraints.md)—no raw stack traces to clients.

---

## 12. Revision history

| Date | Change |
|------|--------|
| 2026-05-03 | Initial publication (target architecture and rollout plan). |
