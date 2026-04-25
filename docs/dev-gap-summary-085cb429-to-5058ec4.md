# Summary: commits and changes removed from `dev`

This document records what was on branch `dev` **after** commit `085cb4293984de4e2db768f45f256a831003b401` and **before** `dev` was reset back to `085cb4293984de4e2db768f45f256a831003b401`.

## Reference commits

| Role | SHA | Subject (short) |
|------|-----|-----------------|
| **Target (restored `dev` tip)** | `085cb4293984de4e2db768f45f256a831003b401` | fix(mobile): feed content-type filters must exclude unmatched posts |
| **Previous `dev` tip** | `5058ec4b1f1a52cdd23418011317763c46e1f243` | Merge pull request #22 (google-login-fix) |

Merge-base of the two tips was `085cb4293984de4e2db768f45f256a831003b401` (linear extension: all removed work sits on top of that commit).

## Commits that were removed from `dev` (newest first)

1. `5058ec4` — Merge pull request #22 from KarmaCummunity/cursor/google-login-fix-be0c  
2. `7381b4b` — fix(mobile-login): split auth-phase from post-auth-phase; never block UI on non-auth errors  
3. `b4b8b3a` — fix(ssot): UUID guard accepts any well-formed UUID, not just v1–v5  
4. `40c3696` — Merge pull request #21 from KarmaCummunity/cursor/user-identity-ssot-be0c  
5. `bdef874` — Merge pull request #20 from KarmaCummunity/cursor/login-isloading-flicker-be0c  
6. `b70d073` — fix(mobile): keep auth stack mounted during login (no isLoading flicker)  
7. `e7f1cbc` — Merge pull request #18 from KarmaCummunity/cursor/user-identity-ssot-be0c  
8. `008b1cc` — docs(srs): document the User Identity SSoT contract (§8.4.1)  
9. `25b257a` — refactor(mobile): route LoginScreen and FirebaseGoogleButton through AuthSessionService  
10. `f83cee2` — refactor(mobile): make userStore a thin Zustand projection over AuthSessionService  
11. `a2f0549` — feat(mobile): introduce AuthSessionService — single SSoT pipeline for client session  
12. `64cf0cf` — feat(api): resolve user_id query params via UserResolutionService in community-group-challenges  
13. `1efb946` — feat(api): enforce canonical UUID subject on new JWTs (SSoT)  
14. `a9e7296` — Merge pull request #17 from KarmaCummunity/cursor/posts-feed-filter-modal-85b2  
15. `f413fe6` — Merge pull request #15 from KarmaCummunity/cursor/posts-feed-filter-modal-85b2  

## Files touched in the removed range (`085cb429..5058ec4`)

Aggregate diff stat:

```
11 files changed, 1411 insertions(+), 801 deletions(-)
```

| Path | Change (high level) |
|------|---------------------|
| `apps/api/src/auth/jwt.service.ts` | JWT / subject handling aligned with SSoT (canonical UUID on new tokens). |
| `apps/api/src/auth/jwt.service.spec.ts` | Tests updated for JWT behavior. |
| `apps/api/src/.../community-group-challenges.controller.ts` | `user_id` query resolution via `UserResolutionService`. |
| `apps/mobile/session/AuthSessionService.ts` | **New** — central client session pipeline (SSoT). |
| `apps/mobile/session/__tests__/AuthSessionService.test.ts` | **New** — unit tests for `AuthSessionService`. |
| `apps/mobile/session/loginFlows.ts` | **New** — login flow helpers. |
| `apps/mobile/session/userProfileId.ts` | **New** — user profile id helpers. |
| `apps/mobile/stores/userStore.ts` | Large refactor: thin store over `AuthSessionService`. |
| `apps/mobile/screens/LoginScreen.tsx` | Routed through new session layer; loading/flicker fixes. |
| `apps/mobile/components/FirebaseGoogleButton.tsx` | Google sign-in wired through session service; auth vs post-auth phase split. |
| `docs/SRS.md` | User Identity SSoT contract section (§8.4.1). |

## Thematic summary

- **API / identity:** Stricter JWT subject rules and user-id resolution on community group challenges endpoints.  
- **Mobile / auth:** Introduction of `AuthSessionService` as the single session source of truth, refactored `userStore`, login screen and Google button behavior, fixes for loading flicker and for not blocking the UI on non-auth errors; UUID validation relaxed to any well-formed UUID.  
- **Documentation:** SRS updated for the identity SSoT contract.  
- **Merges:** Several PR merges for posts feed filter modal, user identity SSOT, login flicker, and Google login fix branches.

## How to recover the removed work

The commits above still exist in the remote repository until garbage-collected; they can be restored by merging or cherry-picking from the old tip, for example:

```bash
git cherry-pick 085cb4293984de4e2db768f45f256a831003b401..5058ec4b1f1a52cdd23418011317763c46e1f243
```

(or reset/merge to `5058ec4b1f1a52cdd23418011317763c46e1f243` if that ref is still reachable).

---

*Generated when resetting `dev` to `085cb4293984de4e2db768f45f256a831003b401`.*
