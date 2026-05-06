<div dir="ltr" lang="en">

# PRD MVP Contradictions and Issues Audit

**Scope:** `docs/SSOT/PRD_MVP/*.md`  
**Audit date:** May 2026  
**Purpose:** Document contradictions, ambiguity, scope drift, and traceability issues found across the MVP PRD documents.  
**Note:** This file is an audit artifact only. It does not resolve or override any product requirement.

---

## Severity and priority model

| Level | Meaning |
| --- | --- |
| Critical | Blocks coherent implementation or creates a direct MVP scope/KPI contradiction. |
| High | Likely to cause divergent product, UX, analytics, or moderation behavior. |
| Medium | Ambiguous or incomplete requirement that should be clarified before implementation. |
| Low | Documentation hygiene, copy, numbering, or traceability issue. |

| Priority | Meaning |
| --- | --- |
| P0 | Resolve before MVP implementation starts. |
| P1 | Resolve before the affected feature is implemented or tested. |
| P2 | Resolve during PRD cleanup before handoff to design/engineering. |
| P3 | Editorial cleanup; low product risk. |

---

## P0 - implementation blockers

| # | Severity | Issue | Evidence | Why it matters |
| --- | --- | --- | --- | --- |
| 1 | Critical | Guest access model is internally inconsistent. | `02_Personas_Roles.md:24-26`, `02_Personas_Roles.md:70`; versus `03_Core_Features.md:29`, `03_Core_Features.md:201-205`, `04_User_Flows.md:40-44`, `05_Screen_UI_Mapping.md:103-109`, `07_Business_Rules.md:14`. | Guests are simultaneously defined as unable to view the feed and able to view a 3-post feed preview. Permissions, routing, analytics, and onboarding cannot be implemented from one coherent rule. |
| 2 | Critical | Unauthenticated navigation forbids the guest preview flow. | `06_Navigation_Structure.md:173-175`; versus `03_Core_Features.md:201-205`, `04_User_Flows.md:40-44`, `05_Screen_UI_Mapping.md:103-109`. | The navigation rule says unauthenticated users only see Splash/Auth, while the product flow requires a limited feed screen. |
| 3 | High | Splash screen is missing the guest-preview entry point. | `04_User_Flows.md:30-43`; versus `05_Screen_UI_Mapping.md:57-64`. | The flow requires a "צפה כאורח" CTA, but the screen spec lists only signup and login. |
| 4 | Critical | MVP success KPI depends on likes, but likes are out of scope. | `01_Vision_Goals.md:77`; versus `08_Out_of_Scope_and_Future.md:81-83`. | A success criterion includes "לחיצת לייק", while likes on posts are explicitly deferred to V2. |
| 5 | Critical | Full address is both optional and mandatory. | `03_Core_Features.md:243-250`; versus `04_User_Flows.md:77-78`, `04_User_Flows.md:101-103`, `05_Screen_UI_Mapping.md:176-180`, `07_Business_Rules.md:44`, `07_Business_Rules.md:53`. | The Create Post spec places full address under optional fields, while flows, screen mapping, and rules require it for every post. |
| 6 | High | Comments are referenced in moderation, but post comments are out of MVP. | `02_Personas_Roles.md:54-58`, `04_User_Flows.md:189-199`, `05_Screen_UI_Mapping.md:379`, `07_Business_Rules.md:58`; versus `08_Out_of_Scope_and_Future.md:81-83`. | Reporting and admin rules include "תגובה" although post comments do not exist in the MVP scope. |

---

## P1 - high-priority product and rules alignment

| # | Severity | Issue | Evidence | Why it matters |
| --- | --- | --- | --- | --- |
| 7 | High | Statistics screen has 4 cards in one source and 3 cards in others. | `03_Core_Features.md:432-437`; versus `04_User_Flows.md:249-252`, `05_Screen_UI_Mapping.md:294-303`. | UX, analytics, and QA will disagree on whether the followers card is part of the MVP stats screen. |
| 8 | High | North Star and closure analytics are not precise enough. | `01_Vision_Goals.md:52-54`, `01_Vision_Goals.md:60-63`, `01_Vision_Goals.md:72-75`; versus `03_Core_Features.md:327-336`, `03_Core_Features.md:357-365`. | The PRD uses Closed-Delivered and 300 deliveries as success measures, but closure without recipient still updates "חפצים שמסרתי" and uses `deleted_no_recipient`; it is unclear what counts toward North Star and conversion KPIs. |
| 9 | High | Admin is described as off-app/no UI while also having in-app special powers. | `02_Personas_Roles.md:15`, `02_Personas_Roles.md:48-60`, `02_Personas_Roles.md:114`; `05_Screen_UI_Mapping.md:376-382`; `08_Out_of_Scope_and_Future.md:49`. | The documents reject Admin UI but still define hidden in-app chat/profile actions for the super admin. The boundary between "no admin UI" and "hidden moderation UI" is unclear. |
| 10 | High | User-level 3-report behavior is inconsistent between flows and rules. | `04_User_Flows.md:194-201`; versus `07_Business_Rules.md:58`. | The flow says a reported user account is suspended after 3 reports, while the business rule says "removal" of an item and does not clearly define user suspension. |
| 11 | High | "Mandatory photo" is ambiguous and conflicts with optional profile photo. | `00_Index.md:37`, `01_Vision_Goals.md:90`; versus `03_Core_Features.md:36-38`, `07_Business_Rules.md:87`. | The safety principle says photo is mandatory, while profile photo is optional. It likely means item photo for "give" posts, but the documents do not say that clearly. |
| 12 | High | Publish confirmation order differs between feature spec and user flow. | `03_Core_Features.md:264-268`; versus `04_User_Flows.md:81-83`. | Core Features places followers-only/private reminders before publishing; the flow lists success first and then conditional dialogs, implying a different state machine. |
| 13 | High | Screen inventory count is inconsistent in the same file. | `05_Screen_UI_Mapping.md:7`, `05_Screen_UI_Mapping.md:49`. | The MVP is described as about 22 screens and also about 27 screens/modals. Scope tracking is unclear. |
| 14 | High | Reopen rules conflict with no-recipient deletion timing. | `03_Core_Features.md:333-345`, `03_Core_Features.md:357-365`, `04_User_Flows.md:142-160`, `07_Business_Rules.md:33-38`. | No-recipient closures are marked `deleted_no_recipient` and deleted after 7 days, but reopen language also says the owner can reopen a closed post "at any time." The allowed reopen window and post availability are not consistently defined. |

---

## P2 - clarification and handoff cleanup

| # | Severity | Issue | Evidence | Why it matters |
| --- | --- | --- | --- | --- |
| 15 | Medium | Document version header is behind the changelog. | `00_Index.md:5`, `00_Index.md:17-18`. | The header says version 1.1 while the changelog includes substantive version 1.2 changes. |
| 16 | Medium | Apple SSO is missing from summary-level auth references. | `00_Index.md:65`, `03_Core_Features.md:453`; versus `03_Core_Features.md:20-27`, `04_User_Flows.md:31`, `05_Screen_UI_Mapping.md:66-74`, `07_Business_Rules.md:20`. | Detailed auth rules require Apple on iOS, but summary tables still describe signup as Google/phone/email only. |
| 17 | Medium | Onboarding skip conflicts with mandatory active-profile fields. | `03_Core_Features.md:32-38`, `04_User_Flows.md:32-33`, `05_Screen_UI_Mapping.md:80-85`; versus `07_Business_Rules.md:87`. | Name and city are mandatory for an active profile, yet onboarding allows skipping or empty values. The blocking point is not defined. |
| 18 | Medium | Guest overlay destination differs. | `03_Core_Features.md:203-204`; versus `04_User_Flows.md:43`. | One document sends the user back to Splash, another to Auth. |
| 19 | Medium | Settings navigation map omits destinations that exist in the screen spec. | `06_Navigation_Structure.md:78-84`; versus `05_Screen_UI_Mapping.md:278-289`, `05_Screen_UI_Mapping.md:310-320`. | The map lists Stats, Blocked Users, and Logout, but omits Follow Requests and privacy-specific routes. |
| 20 | Medium | Duplicate section number `6.6` creates ambiguous anchors. | `06_Navigation_Structure.md:113-168`, `06_Navigation_Structure.md:171-185`. | References to section 6.6 can resolve to either cross-platform strategy or special navigation states. |
| 21 | Medium | Cross-references are broken or ambiguous. | `03_Core_Features.md:61`; `04_User_Flows.md:294`, `04_User_Flows.md:298`; `05_Screen_UI_Mapping.md:390-408`. | `#21` does not clearly point to the profile screen, and "(3.3)" may mean User Profile in screen mapping or Items in Core Features. |
| 22 | Medium | Location/privacy wording mixes no GPS with full-address capture. | `03_Core_Features.md:246-250`, `03_Core_Features.md:281`; `07_Business_Rules.md:44`, `07_Business_Rules.md:53`, `07_Business_Rules.md:107`. | The PRD says no user location is stored beyond registered city, yet every post captures street and number. Collection, display, retention, and sorting should be separated explicitly. |
| 23 | Medium | False-report suspension rule is underspecified. | `04_User_Flows.md:201`, `07_Business_Rules.md:63`. | "5 false reports in a row" does not define who determines falsehood, what "in a row" means, or whether it is per target or global. |
| 24 | Medium | Expired post lifecycle is incomplete. | `03_Core_Features.md:342-365`, `07_Business_Rules.md:36-38`. | `expired` exists as a status, but the PRD does not define whether expired posts can be reopened, edited, deleted, or listed. |
| 25 | Medium | Prohibited paid-post detection is underspecified. | `07_Business_Rules.md:41`, `07_Business_Rules.md:79`, `07_Business_Rules.md:111-117`. | The PRD says price/payment detection triggers reports/removal, but does not define whether detection is manual, keyword-based, automated, or admin-reviewed. |
| 26 | Medium | Immediate-removal policy and 3-report policy overlap. | `07_Business_Rules.md:56-58`, `07_Business_Rules.md:111-117`; `04_User_Flows.md:194-201`. | Some prohibited content appears to be removed immediately, while the general workflow removes after 3 reports. Priority and authority are unclear. |
| 27 | Medium | Profile privacy change text can be misread against post visibility upgrades. | `03_Core_Features.md:99-102`, `03_Core_Features.md:149-153`, `07_Business_Rules.md:62`, `07_Business_Rules.md:66`. | Profile privacy changes do not retroactively change post visibility, but individual posts can later increase visibility. The distinction should be explicit for implementation and legal review. |
| 28 | Medium | Password settings behavior is not defined for OAuth-only users. | `03_Core_Features.md:412-415`, `05_Screen_UI_Mapping.md:281-282`. | The documents say password change applies if relevant/email login, but do not say whether OAuth users see a hidden row, disabled row, or explanation. |

---

## P3 - documentation hygiene

| # | Severity | Issue | Evidence | Why it matters |
| --- | --- | --- | --- | --- |
| 29 | Low | KPI table contains unclear wording. | `01_Vision_Goals.md:63`. | "מדד באיון" appears to be a typo or corrupted label. |
| 30 | Low | Index says there are only 2 MVP roles while operational admin also exists. | `00_Index.md:62`; versus `02_Personas_Roles.md:48-61`. | This is acceptable if the table means end-user roles only, but the distinction is not stated. |
| 31 | Low | Rule ID range notation is inconsistent with exact IDs. | `07_Business_Rules.md:95`, `08_Out_of_Scope_and_Future.md:142`. | `R-MVP-Privacy-11..13` is readable but less grep-friendly than listing exact rule IDs. |
| 32 | Low | Flow-to-screen traceability is incomplete. | `04_User_Flows.md:6`, `05_Screen_UI_Mapping.md:390-408`. | The documents claim flows are linked to screens, but many flow steps rely on prose instead of stable screen IDs. |
| 33 | Low | Publish dialog labels vary slightly. | `03_Core_Features.md:266`; versus `04_User_Flows.md:82`. | "פרסם רק לעוקבים" and "עוקבים בלבד" likely mean the same action, but inconsistent labels complicate copy QA and analytics naming. |

---

## Recommended resolution order

1. **Resolve guest mode as one model:** decide whether guests see no feed or a 3-post preview; then align personas, rules, navigation, Splash CTA, and screen 1.7.
2. **Fix KPI/scope contradictions:** remove likes from MVP success criteria or bring likes into MVP; define which closure states count toward delivery KPIs.
3. **Align post creation rules:** decide whether full address is mandatory, and separate address collection from address display.
4. **Clean moderation scope:** remove comments from MVP moderation or explicitly define the comment-like entity being reported; codify user suspension.
5. **Normalize stats and admin UI:** settle 3 vs 4 stats cards and define whether super-admin hidden in-app actions are inside MVP scope.
6. **Run doc hygiene pass:** update version, section numbering, anchors, screen counts, and summary tables after product decisions are made.

</div>
