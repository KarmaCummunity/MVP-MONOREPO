# SSOT — documentation source of truth (kc-monorepo)

This folder holds **all** operational and quality-related Markdown for the monorepo, for consistency and easier context management (humans, CI, and AI tools).

## Index

| Type | Path | What it is |
|------|------|------------|
| **Requirements (what)** | [SRS/README.md](SRS/README.md) | Software requirements, architecture-at-product level, gaps — split by topic. |
| **Code quality (how)** | [CODE_QUALITY/README.md](CODE_QUALITY/README.md) | Layers, constraints, testing expectations, technical-debt log. |
| **Runbooks (operations)** | [runbooks/api/](runbooks/api/) | API: Railway, Redis, security, sync, troubleshooting. |
| | [runbooks/mobile/](runbooks/mobile/) | Mobile: OAuth, E2E, Landing, and related. |
| **Migration history** | [migrations/api/](migrations/api/) | One-off / historical API migration notes (not live requirements). |
| **Technical reference** | [reference/api/](reference/api/) | Deeper technical detail (e.g. collections) — not a substitute for SRS. |
| | [reference/posts-visibility-workflow-and-stats.md](reference/posts-visibility-workflow-and-stats.md) | Posts: owner hide vs workflow open/closed vs anonymity; profile tabs, feed filter, dashboard metrics. |
| **Internal (non-SRS)** | [internal/](internal/) | Internal reports (Sonar, progress, mobile audit), [ssot-tightening-phased-plan.md](internal/ssot-tightening-phased-plan.md) — not product authority. |

Runbooks, migration notes, and internal reports are **not** software requirements. Do not treat them as the SRS; use [SRS](SRS/README.md) and [CODE_QUALITY](CODE_QUALITY/README.md) for feature and architecture work.

## Precedence (when two documents disagree)

1. Reconcile with **both** [SRS](SRS/README.md) and [CODE_QUALITY](CODE_QUALITY/README.md) where the topic is covered.
2. For **product behavior and scope**, prefer **SRS** over any operational or internal doc.
3. If **CODE_QUALITY** and **SRS** conflict on *what* the system must do, **prefer SRS** and record the gap in [SRS/10-gaps-and-assumptions.md](SRS/10-gaps-and-assumptions.md) and/or [CODE_QUALITY/tech-debt-log.md](CODE_QUALITY/tech-debt-log.md), as appropriate.

(Aligned with the project’s Cursor rules under `.cursor/rules/`.)

## Recommended reading order

1. This file (orientation).
2. [SRS/README.md](SRS/README.md), then only the SRS file(s) for the area in question (e.g. a file under [SRS/functional/](SRS/functional/) or a numbered section file).
3. [CODE_QUALITY/README.md](CODE_QUALITY/README.md) and, as needed, `layers-and-boundaries`, `constraints`, and `testing`.
4. [runbooks/](runbooks/) / [migrations/api/](migrations/api/) / [reference/api/](reference/api/) / [internal/](internal/) only when the task is operations, old migrations, extra technical detail, or internal reporting — not as a default substitute for (2) and (3).

## Exceptions (paths outside SSOT)

- **`README.md`** at the monorepo root — GitHub entrypoint.
- **`apps/api/CHANGELOG.md`** — kept next to the package for release tooling.
- **`apps/*/README.md`** — short pointers into this tree; avoid duplicating long specification here.

## Scripts

- Optional Hebrew → English pass: [scripts/translate_md_hebrew_to_en.py](scripts/translate_md_hebrew_to_en.py) (requires `deep-translator` in a venv).
