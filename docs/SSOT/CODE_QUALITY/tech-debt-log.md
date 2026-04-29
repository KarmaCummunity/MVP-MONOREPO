## Technical debt journal

| Date | Item | Notes |
|--------|------|--------|
| 2026-04-26 | ~~`[PENDING REFACTOR]:` Split `apps/mobile/donationScreens/TrumpScreen.tsx`~~ **Done (initial split)** | Implemented: `donationScreens/trump/` — `useTrumpScreenData`, `useTrumpOfferRideFlow`, `mapPostToFeedItemForTrumpScreen`, `trumpScreen.styles`; shell `TrumpScreen.tsx` ~330 LOC. Fixes: `loadRides`/`getFilteredRides` stale `mode` deps, `await loadRides()` after publish, `RideOfferForm` `isSubmitting`. Follow-ups: shrink hooks toward ~200 LOC/file; dedupe `mapPostToFeedItem*` with `useFeedData` if desired. |
| — | — | Add rows here; Use of `[PENDING REFACTOR]: ...` from the work rules |
| 2026-04-27 | ~~`[PENDING REFACTOR]:` Shared i18n for donation open-request CTAs~~ **N/A (KnowledgeScreen removed)** | Prior note referred to `KnowledgeScreen`; screen removed from Donations stack. |
| 2026-04-26 | ~~`[PENDING REFACTOR]: apps/mobile/donationScreens/ItemsScreen.tsx`~~ **Done (initial split)** | Implemented: `donationScreens/items/` — `useItemsScreenData`, `useItemsScreenFilters`, `itemsScreenFiltering`, mappers, `itemsScreen.styles`, `ItemsScreenSearchMode` / `ItemsScreenOfferMode`, `items.*.donationScreen` i18n (he/en). Shell `ItemsScreen.tsx` ~376 LOC. Follow-ups: further shrink filtering/hooks toward ~200 LOC/file; align tag filter values with stored tag locale if needed. |
| 2026-04-27 | `[PENDING REFACTOR]:` Orphan `donationScreens/*` wrappers after DonationsStack trim | `DonationsStack` / deep linking expose **items**, **rides (Trump)**, and **challenges** flows; `ClothesScreen`, `DreamsScreen`, `CategoryScreen`, and similar files remain in the tree but are not registered routes—delete or re-wire if product restores those flows. |
| 2026-04-27 | `[PENDING REFACTOR]:` Admin dynamic tables API without mobile UI | Mobile admin screens `AdminTables` / `AdminTableRows` were removed from the app; backend `AdminTablesController` and `apiService.admin.tables` remain if a web admin or script still needs CRUD. |

Gaps against a product are listed in [SRS §10](../SRS/10-gaps-and-assumptions.md).