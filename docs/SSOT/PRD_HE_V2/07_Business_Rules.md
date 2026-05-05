<div dir="rtl" lang="he">

## 📋 7. כללים עסקיים מרכזיים

1. **אימות זהות ו-וי כחול:** משתמש מאומת הוא משתמש שמילא את כל פרטי הפרופיל, העלה תעודת זהות ועבר בדיקת תקינות. אין הבדל בהרשאות הפעולה בין משתמש רשום למאומת, למעט הצגת ה"וי הכחול" לצרכי אמינות ומוניטין בקהילה.
2. **מתנדב = שיוך לארגון:** אין מתנדבים "עצמאיים" ללא ארגון.
3. **נסיעות ללא רווח:** השתתפות בהוצאות בלבד – מודל פילנתרופי.
4. **צ'אט קבוצתי מוגבל:** רק סביב פרויקט/אתגר, ננעל בסיום.
5. **תרומת ידע מפוקחת:** אישור מראש מהנהלת הארגון.
6. **Audit Trail מלא:** כל פעולה במערך השידוכים מתועדת ולא ניתנת למחיקה.
7. **רמת אנונימיות לא ניתנת להורדה:** אחרי פרסום, ניתן רק להפוך לפומבי יותר.
8. **אורח = צפייה בלבד:** אף פעולה אקטיבית ללא הרשמה.
9. **עיצוב אישי ברמת משתמש:** שינויי UI לא משפיעים על אחרים. עיצוב עמותה כן.
10. **רב-שפתי:** כל טקסט מגיע מקבצי שפה גלובליים (עברית ואנגלית).

<section dir="ltr" lang="en">

## 7.1 Additive SRS alignment rules and open-product clarifications

The rules above remain in place. The following additions clarify areas where the deeper SRS review identified likely product or implementation mistakes.

11. **Post anonymity uses four levels in the SRS:** product, design, and implementation should support Levels 1-4. Level 4 is the default fully public mode. Level 3 is public but redacted, with no direct DM to the author. Level 1 and Level 2 enter the operator queue automatically; Level 3 and Level 4 can request operator help manually.
12. **Identity reveal in operator matching requires consent:** candidates receive only a scoped need description until mutual acceptance. Full names and contact details are revealed only after both sides agree, or communication remains platform-mediated if product policy supports it.
13. **Shiduchim Tov and romantic Matchmaking are separate products:** Shiduchim Tov is the social-good operator-assisted matching workflow. The existing matchmaking category is for romantic/singles-related community assistance and should not share queues, cases, or sensitive operator data.
14. **Operator access is narrow and audited:** operator access is limited to queue, cases, candidates, notes, and audit screens. It does not imply organization finance, role management, or full admin privileges.
15. **PII access must be logged:** every operator/admin read of requester identity for Level 1/2/3 posts should create an immutable audit record, including actor, action, timestamp, case/post context, and relevant metadata.
16. **Audit retention baseline:** matching-case audit logs should be insert-only and retained for at least two years or longer if legal policy requires it.
17. **Donations payment flow is not a confirmed payment processor:** until a payment gateway is implemented and approved, donation screens should distinguish between recording a donation intent/pledge, redirecting to an external approved payment provider, and issuing a confirmed receipt.
18. **Organization features may be phased:** organization onboarding, volunteer membership, org dashboards, and org finance should be treated as product requirements even where the current implementation is partial. MVP labels should be visible in planning documents where flows depend on unfinished APIs.
19. **Give / Receive terminology is required:** donation-context creation and feed cards should consistently present `give` and `request` intent markers using localized labels (`לתת / לקבל`) and should surface open request lists inside category give flows.
20. **Guest mode is read-only:** guest users may view public or redacted-public content but cannot create content, message, follow, report, donate, volunteer, join rides, or access profile-specific screens.
21. **Accessibility is a business requirement:** core flows must remain usable with dynamic text size, screen readers, keyboard/focus navigation where applicable, sufficient contrast, and RTL-safe layouts.
22. **Offline and sync states must be explicit:** creation, chat, matching, payment, and admin actions require clear online/offline handling. Sensitive operator actions should not be silently queued if the user may assume they already took effect.
23. **Moderation applies across privacy levels:** admins/super-admins may review reported or abusive content even when it is hidden from the public, but access must follow audit and minimization rules.
24. **Role changes take effect immediately:** if a user's operator/admin role is revoked during a session, the next protected action should fail safely, redirect to the appropriate non-privileged view, and avoid exposing cached sensitive data.
25. **Friendly error handling:** user-facing errors should explain what happened and what the user can do next, without exposing stack traces, SQL errors, provider tokens, or internal identifiers.

</section>

---

*נכתב במטרה להנחות את הפיתוח, העיצוב והחשיבה העסקית של הפלטפורמה, תוך מיקוד במשתמש הקצה, צרכי הארגונים והמחויבות לקהילה חזקה, יעילה ופרטית.*

---
*חזרה ל[אינדקס ראשי](./00_Index.md)*

</div>
