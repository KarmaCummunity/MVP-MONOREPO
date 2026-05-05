<div dir="rtl" lang="he">

## 📐 6. ניווט ומבנה האפליקציה

### 6.1 ניווט תחתון (Bottom Tab Bar)
| #   | לשונית   | מסך ברירת מחדל     | תיאור          |
| --- | -------- | ------------------ | -------------- |
| 1   | 🏠 בית    | Home Screen (Feed) | הפיד הראשי     |
| 2   | 💝 תרומות | Donations Screen   | קטגוריות תרומה |
| 3   | 🔍 חיפוש  | Search Screen      | חיפוש + AI     |
| 4   | 👤 פרופיל | Profile Screen     | הפרופיל שלי    |

### 6.2 ניווט עליון (Top Bar)
מסכים הנגישים מכל מקום דרך הסרגל העליון:
* צ'אט (Chat List)
* התראות (Notifications)
* הגדרות (Settings)
* אודות (About)

### 6.3 ניווט Admin
גישה למסכי ניהול דרך סרגל עליון (מותנה בהרשאות). כולל:
* Admin Dashboard, People, Money, Tasks, Files, Tables, CRM, Time, Review, Org Approvals, Admins.

<section dir="ltr" lang="en">

### 6.4 Additive navigation alignment with the SRS

The navigation model should be interpreted together with `docs/SSOT/SRS/04-frontend-architecture.md`.

#### 6.4.1 Conditional tabs and guest behavior
* The Admin area should be represented as a permission-gated navigation entry for `admin`, `org_admin`, and `super_admin` users where product policy allows it.
* Guest users may browse public content, but the Profile tab should either be hidden or replaced with a sign-up prompt because there is no personal profile to manage in guest mode.
* The top-bar shortcuts for chat, notifications, settings, and about remain shared access points, but guest users should see a registration prompt before any active or personal action.

#### 6.4.2 Donations stack additions
* The Donations tab should include both the existing romantic/singles `Matchmaking` category and the separate `Shiduchim Tov` / Good Matching entry.
* `Shiduchim Tov` should route non-operators to an explainer view and operators/admin oversight roles to the operator workspace.
* Challenges may remain discoverable from donation/community category navigation as long as deep links and top-level entry points are consistent.

#### 6.4.3 Shared modal and cross-stack entry points
* The global create action should open a unified composer that supports Give / Receive (`give` / `request`), category selection, and anonymity level selection.
* Bookmarks, followers, discover people, user profiles, notifications, chat detail, settings, and web-view screens are shared destinations and should not depend on the currently selected bottom tab.
* Deep links should preserve role checks: opening an operator or admin route without permission should redirect to the relevant explainer or access-denied experience rather than exposing empty screens.

</section>

---
*הפרק הבא: [7. כללים עסקיים מרכזיים](./07_Business_Rules.md)*
*חזרה ל[אינדקס ראשי](./00_Index.md)*

</div>
