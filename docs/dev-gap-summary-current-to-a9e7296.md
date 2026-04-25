# Summary: gap between remote `dev` and reset tip `a9e7296`

This document records what **`origin/dev` pointed to before** resetting `dev` to **`a9e729633a20a8a44c87246e0b0a9a6332df23a7`**, and what is **lost from the branch tip** by that reset.

## Reference commits

| Role | Full SHA | Short | Message |
|------|----------|-------|---------|
| **Remote `dev` tip (before push)** | `5058ec4b1f1a52cdd23418011317763c46e1f243` | `5058ec4` | Merge pull request #22 from KarmaCummunity/cursor/google-login-fix-be0c |
| **New `dev` tip (after reset)** | `a9e729633a20a8a44c87246e0b0a9a6332df23a7` | `a9e7296` | Merge pull request #17 from KarmaCummunity/cursor/posts-feed-filter-modal-85b2 |

## Commits removed from `dev` by moving the tip to `a9e7296` (newest first)

These commits were reachable from `5058ec4` but are **not** ancestors of `a9e7296`:

1. `5058ec4` — Merge pull request #22 (google-login-fix)  
2. `7381b4b` — fix(mobile-login): split auth-phase from post-auth-phase; never block UI on non-auth errors  
3. `b4b8b3a` — fix(ssot): UUID guard accepts any well-formed UUID, not just v1–v5  
4. `40c3696` — Merge pull request #21 (user-identity-ssot)  
5. `bdef874` — Merge pull request #20 (login-isloading-flicker)  
6. `b70d073` — fix(mobile): keep auth stack mounted during login (no isLoading flicker)  
7. `e7f1cbc` — Merge pull request #18 (user-identity-ssot)  
8. `008b1cc` — docs(srs): document the User Identity SSoT contract (§8.4.1)  
9. `25b257a` — refactor(mobile): route LoginScreen and FirebaseGoogleButton through AuthSessionService  
10. `f83cee2` — refactor(mobile): make userStore a thin Zustand projection over AuthSessionService  
11. `a2f0549` — feat(mobile): introduce AuthSessionService — single SSoT pipeline for client session  
12. `64cf0cf` — feat(api): resolve user_id query params via UserResolutionService in community-group-challenges  
13. `1efb946` — feat(api): enforce canonical UUID subject on new JWTs (SSoT)  

## File-level diff (`a9e7296` → former remote tip `5058ec4`)

Aggregate:

```
11 files changed, 1411 insertions(+), 801 deletions(-)
```

| Path | Summary |
|------|---------|
| `apps/api/src/auth/jwt.service.ts` | Canonical UUID subject on new JWTs (SSoT). |
| `apps/api/src/auth/jwt.service.spec.ts` | Spec updates for JWT behavior. |
| `apps/api/src/.../community-group-challenges.controller.ts` | Resolve `user_id` query via `UserResolutionService`. |
| `apps/mobile/session/AuthSessionService.ts` | **Added** — single client session pipeline. |
| `apps/mobile/session/__tests__/AuthSessionService.test.ts` | **Added** — tests. |
| `apps/mobile/session/loginFlows.ts` | **Added** — login flow helpers. |
| `apps/mobile/session/userProfileId.ts` | **Added** — profile id helpers. |
| `apps/mobile/stores/userStore.ts` | Refactor: thin Zustand layer over `AuthSessionService`. |
| `apps/mobile/screens/LoginScreen.tsx` | Session layer, loading/flicker behavior. |
| `apps/mobile/components/FirebaseGoogleButton.tsx` | Google sign-in through session service; auth vs post-auth phases. |
| `docs/SRS.md` | User Identity SSoT contract (§8.4.1). |

## Note: same tree as `085cb429` vs `a9e7296`

If your **local** `dev` had only been at `085cb4293984de4e2db768f45f256a831003b401` before this operation, then **resetting to `a9e7296` does not change the file tree** relative to `085cb429` (both share tree `304c10b23b35cf0c0759cc2b769a388c5c53ab37`); it only adds merge commits `f413fe6` and `a9e7296` to history. The **large** code removal relative to **remote** `dev` at `5058ec4` is summarized in the sections above.

## How to recover the removed work

Commits still exist in the remote until garbage-collected; restore by merging or resetting to `5058ec4b1f1a52cdd23418011317763c46e1f243`, or cherry-pick:

```bash
git cherry-pick a9e729633a20a8a44c87246e0b0a9a6332df23a7..5058ec4b1f1a52cdd23418011317763c46e1f243
```

---

*Generated when resetting `dev` to `a9e729633a20a8a44c87246e0b0a9a6332df23a7` (relative to prior `origin/dev` at `5058ec4`).*
