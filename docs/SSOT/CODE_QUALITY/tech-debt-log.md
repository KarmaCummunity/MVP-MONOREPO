## Technical debt journal

| Date | Item | Notes |
|--------|------|--------|
| 2026-04-26 | ~~`[PENDING REFACTOR]:` Split `apps/mobile/donationScreens/TrumpScreen.tsx`~~ **Done (initial split)** | Implemented: `donationScreens/trump/` — `useTrumpScreenData`, `useTrumpOfferRideFlow`, `mapPostToFeedItemForTrumpScreen`, `trumpScreen.styles`; shell `TrumpScreen.tsx` ~330 LOC. Fixes: `loadRides`/`getFilteredRides` stale `mode` deps, `await loadRides()` after publish, `RideOfferForm` `isSubmitting`. Follow-ups: shrink hooks toward ~200 LOC/file; dedupe `mapPostToFeedItem*` with `useFeedData` if desired. |
| — | — | Add rows here; Use of `[PENDING REFACTOR]: ...` from the work rules |
| 2026-04-27 | `[PENDING REFACTOR]:` Shared i18n for donation open-request CTAs | `KnowledgeScreen` reuses `items` namespace strings (`donationScreen.search.requestCta`, `donationScreen.offer.openRequestsList`) to match copy without adding a new locale file; consider a shared `donations` or `donationScreens` namespace if more screens need the same strings. |
| 2026-04-26 | ~~`[PENDING REFACTOR]: apps/mobile/donationScreens/ItemsScreen.tsx`~~ **Done (initial split)** | Implemented: `donationScreens/items/` — `useItemsScreenData`, `useItemsScreenFilters`, `itemsScreenFiltering`, mappers, `itemsScreen.styles`, `ItemsScreenSearchMode` / `ItemsScreenOfferMode`, `items.*.donationScreen` i18n (he/en). Shell `ItemsScreen.tsx` ~376 LOC. Follow-ups: further shrink filtering/hooks toward ~200 LOC/file; align tag filter values with stored tag locale if needed. |

Gaps against a product are listed in [SRS §10](../SRS/10-gaps-and-assumptions.md).