# Recovery Plan - MVP White Screen Fix

## 1. Summary of current situation
We returned (Hard Revert) to the last stable commit: **`209de97`** ("fix sub tsak and try fix scrolling").
In this version:
- The site loads normally (no white screen).
- No destructive script (`fix-scroll-html.sh`).
- The new features developed in "improve admin dashboard" are missing.

## 2. Analysis of the changes ("the delta")
The problematic commit (`6ab7ef8`) contained 5 main groups of changes (over 3,000 lines of code):

### a. A system of dynamic administration tables (Admin Tables)
* **Files**: `screens/AdminTablesScreen.tsx`, `screens/AdminTableRowsScreen.tsx`
* **Essence**: viewing and editing database tables directly from the admin.

### b. Time management and tasks (Time Management)
* **Files**: `screens/AdminTimeManagementScreen.tsx`, `components/TaskHoursModal.tsx`, `screens/AdminTasksScreen.tsx`
* **Gist**: Hours reporting, hours model, and improvements to the tasks screen.

### c. Dashboard & Hierarchy
* **Files**: `screens/AdminDashboardScreen.tsx`, `components/AdminHierarchyTree.tsx`, `screens/LandingSiteScreen.tsx`
* **Gist**: Redesign of the dashboard, adding a visual admin tree.

### d. File and chat management (Files & Chat)
* **Files**: `screens/AdminFilesScreen.tsx`, `screens/ChatDetailScreen.tsx`
* **Gist**: Improvements in the file interface and chat handling.

### e. Infrastructure and Miscellaneous (Infra)
* **Files**: `utils/storageService.ts`, `utils/apiService.ts`, `scripts/fix-scroll-html.sh`
* **Gist**: New storage service, API updates and the fix script (which caused the crash).

---

## 3. Gradual work plan (Re-integration Plan)
We will return the features one by one, we will check that each one works and does not "break" the site.

### Step 1: Infrastructure (without the problematic script)
- [ ] Returning `utils/storageService.ts` and `utils/apiService.ts`.
- [ ] **Skip** over `scripts/fix-scroll-html.sh`!
- [ ] Build test.

### Step 2: Time and task management
- [ ] return `AdminTimeManagementScreen`, `TaskHoursModal`.
- [ ] Update `AdminTasksScreen`.
- [ ] Update the router (`MainNavigator` / `AdminStack`).
- [ ] test.

### Step 3: Management tables
- [ ] return `AdminTablesScreen`, `AdminTableRowsScreen`.
- [ ] Update the router.
- [ ] test.

### Step 4: Chat and files
- [ ] Reverting the changes in `AdminFilesScreen` and `ChatDetailScreen`.
- [ ] test.

### Step 5: Dashboard and hierarchy (the sensitive part)
- [ ] Returning `AdminHierarchyTree` and updating `AdminDashboardScreen`.
- [ ] Verification that there are no Layout changes that break the scrolling or the App Root.
- [ ] Final inspection.

---
**Important note**: Each step will be accompanied by Deploy and a check that the screen is not white.