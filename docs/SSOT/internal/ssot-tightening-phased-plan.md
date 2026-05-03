# SSOT tightening — phased plan (internal)

**Status:** Internal planning only — **not** product authority. For requirements use [SRS/README.md](../SRS/README.md); for engineering norms use [CODE_QUALITY/README.md](../CODE_QUALITY/README.md).

**Goal:** Break “full SSOT” into small, shippable steps that reduce confusion and drift without a monolithic refactor.

---

## What “SSOT” means here

| Layer | Intended SSOT | Notes |
|--------|----------------|--------|
| Product behavior & scope | SRS shards under `docs/SSOT/SRS/` | Runbooks and internal docs are supporting material. |
| Architecture / quality bar | `docs/SSOT/CODE_QUALITY/` | Conflicts with SRS → prefer SRS; log gaps. |
| Operations & debugging | `docs/SSOT/runbooks/` | Must not contradict SRS for *what* the system does. |
| Code | No second “requirements doc” inside source | Comments and ADRs are hints; SRS + tests ground truth for behavior. |

---

## Parts you can start **now** (Phase 0)

These are low risk and do not require large code changes.

1. **Hotspot inventory (half-day)**  
   For one vertical (recommended first: **authentication / identity**), list in a scratchpad or spreadsheet:  
   - SRS: e.g. `SRS/functional/02-01-authentication.md`, `07-data-flow.md` (auth sections).  
   - API entrypoints: `AuthModule`, guards, JWT service (from SRS cross-refs or repo search).  
   - Runbooks: e.g. `runbooks/api/auto-sync-explanation.md`, `runbooks/mobile/google-auth-*.md`.  
   Outcome: a single bookmarked “map” the team agrees is the starting index.

2. **Same-PR doc drift fix**  
   Whenever a PR changes auth/session/roles behavior, update the relevant SRS shard **or** add a line to [SRS/10-gaps-and-assumptions.md](../SRS/10-gaps-and-assumptions.md) if behavior lags intentionally. No separate initiative required.

3. **Tighten gap hygiene**  
   Review [SRS/10-gaps-and-assumptions.md](../SRS/10-gaps-and-assumptions.md) for auth-related rows (`operator`, `volunteer_manager`, email/Firebase, JWT library choice). For each: add **next concrete step** or **explicit deferral** so gaps are actionable, not ambient.

4. **Tech-debt queue**  
   Use [CODE_QUALITY/tech-debt-log.md](../CODE_QUALITY/tech-debt-log.md) for out-of-scope code refactors discovered during SSOT work (`[PENDING REFACTOR]: …`), per project rules — avoids scope creep in feature PRs.

5. **Frontend state (documentation only)**  
   Confirm team convention: `userStore` as primary session/auth state ([SRS/04-frontend-architecture.md](../SRS/04-frontend-architecture.md)). Document “do not add new consumers on legacy Context” in team notes or a tiny runbook addendum when someone next touches auth UI — optional one-paragraph PR to a mobile runbook.

---

## Phase 1 — Documentation hygiene (days to small weeks)

**Objective:** Fewer contradictions; clearer “where to read first.”

| Step | Action | Done when |
|------|--------|-----------|
| 1.1 | Cross-link SRS auth shard ↔ relevant runbooks (bidirectional one-liners at top of each file). | Navigating from SRS to ops and back is one click. |
| 1.2 | List duplicate endpoint names in SRS once; runbooks reference SRS instead of re-specifying business rules. | Same rule is not copy-pasted in conflicting wording. |
| 1.3 | Add “Precedence” reminder to any long runbook that reads like requirements (pointer to SRS § precedence in [SSOT README](../README.md)). | Readers know runbook vs SRS role. |

**Exit criteria:** New engineer can answer “where is auth specified?” in under five minutes using only `docs/SSOT/`.

---

## Phase 2 — Auth & identity alignment (weeks; can parallel Phase 1)

**Objective:** One coherent story for JWT, Firebase/Google, and `user_profiles` sync — **documentation first**, then code only where justified.

| Step | Action | Done when |
|------|--------|-----------|
| 2.1 | Single narrative doc (could extend existing runbook or add `runbooks/api/auth-identity-overview.md`) describing all entry paths and which is canonical for **new** clients. | No orphan flows only explained in Slack or old tickets. |
| 2.2 | Reconcile SRS §2.1 with runbooks (same names for endpoints and flows). | Gaps in SRS/10 reduced or explicitly accepted. |
| 2.3 | Code changes **only** with scoped tickets (e.g. consolidate duplicate routes, guard consistency) — each PR maps to SRS. | Sonar/security items from gaps log addressed incrementally. |

**Exit criteria:** Security or compliance review can trace identity lifecycle from SRS + one overview + code pointers.

---

## Phase 3 — Client state SSOT (optional; larger)

**Objective:** Reduce parallel sources of session truth on mobile (e.g. legacy Context vs Zustand) without a flag-day.

| Step | Action | Done when |
|------|--------|-----------|
| 3.1 | Inventory all `Context` consumers for auth/session; mark read-only vs write paths. | Spreadsheet or short markdown checklist in `internal/` (optional). |
| 3.2 | Migrate **new** features only through `userStore` / agreed hooks. | No new Context coupling for auth. |
| 3.3 | Strangler migration: replace Context usage file-by-file when those files are already in scope for other work. | Context unused or explicitly deprecated in SRS/frontend doc. |

**Exit criteria:** SRS frontend architecture matches dominant implementation; legacy path documented as deprecated with target removal quarter.

---

## Phase 4 — Governance (ongoing)

| Step | Action | Done when |
|------|--------|-----------|
| 4.1 | PR / review habit: “SRS link + gap log if intentional drift.” | Habitual, not heroic. |
| 4.2 | Quarterly: quick pass for orphan markdown outside `docs/SSOT/` that duplicates SRS — either move pointer into SSOT or delete duplicate. | Less shadow documentation. |

---

## Success metrics (lightweight)

- Time for a developer to locate authoritative auth spec **decreases** (informal survey or onboarding checklist).
- **Fewer** undocumented contradictions between SRS and runbooks (tracked via gap log closure rate).
- **No** requirement for a single “big bang” merge; phases complete independently.

---

## Related references

- [SRS/10-gaps-and-assumptions.md](../SRS/10-gaps-and-assumptions.md) — known product/code gaps.
- [CODE_QUALITY/tech-debt-log.md](../CODE_QUALITY/tech-debt-log.md) — pending refactors.
- [SRS/functional/02-01-authentication.md](../SRS/functional/02-01-authentication.md) — auth requirements shard.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-04-27 | Initial phased plan. |
