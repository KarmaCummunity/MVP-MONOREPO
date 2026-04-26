# Testing expectations

This document complements [`layers-and-boundaries.md`](layers-and-boundaries.md): requirements apply by **architectural role** of the changed code, not by folder name alone. Much of `apps/api` and `apps/mobile` is still legacy layout; judge by **whether the change is domain rules, use-case orchestration, or thin infrastructure/UI**.

## 1. When unit tests are required

For **new or materially changed** logic that acts as **Domain** or **Application** (per the layer doc):

- **Add or update unit tests** next to the implementation or under `__tests__` for that package.
- Cover **failure and boundary cases**, not only the happy path (invalid input, unauthorized paths, empty collections, timeouts where the unit owns retry policy, and so on).
- If behavior is intentionally unchanged (rename, move, type-only refactor), **update** existing tests when imports or seams move; add tests only where coverage would otherwise drop.

**Material change** means any change that can alter observable behavior, invariants, error mapping, or public contracts (including serializers/DTO mapping that enforce authorization or data shape).

## 2. When unit tests are not mandatory (still professional practice)

- **Pure presentation** (layout, styles, copy) with no branching business rules.
- **Documentation-only** or **config-only** edits that do not change runtime code paths.
- **Trivial infrastructure wiring** (e.g. registering an existing provider) with no new branches — still run the existing suite for the touched app if CI or local scripts cover it.

If a change **extracts** logic from UI or infrastructure into testable units, treat the **extracted** code as Domain/Application and add tests there.

## 3. Integration, E2E, and manual checks

- **Unit tests** are the default gate for Domain/Application in this repo’s CODE_QUALITY rules.
- **Integration or E2E** tests are valuable for critical flows (auth, payments, matching); follow each app’s existing patterns (`apps/mobile/scripts`, API e2e if present). They are **not** a substitute for unit coverage of pure domain rules where those rules exist.
- After substantive API or client changes, **run** the relevant package test script (or the monorepo command your team uses) before merge when feasible.

## 4. AI and contributors

- When implementing features, **map tests to the same SRS area** as the code (`docs/SSOT/SRS/`).
- Do not skip tests for Domain/Application changes to “save time”; log intentional gaps in [`tech-debt-log.md`](tech-debt-log.md) only when product explicitly defers quality work, not as a routine bypass.
