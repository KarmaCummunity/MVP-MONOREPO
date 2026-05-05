<div dir="rtl" lang="he">

## 🗺️ 4. זרימות משתמש (User Flows)

### זרימה 1: הרשמה ובניית פרופיל (Onboarding)
**תיאור:** משתמש חדש מוריד את האפליקציה ומבצע הרשמה מלאה. **ניתן לדלג על שלבי בניית הפרופיל בכל עת.**
* **מסך 1 – דף נחיתה (Landing Page):** המשתמש נחשף לאפליקציה. מוצגים חזון, ערכים, יכולות מרכזיות. כפתור בולט: "הצטרף לקהילה" + "המשך כאורח".
* **מסך 2 – התחברות/הרשמה (Auth Screen):** בחירת שיטת הרשמה (Google/Apple/Facebook/טלפון/דוא"ל). מעבר מהיר בין "יש לי חשבון" ל"משתמש חדש".
* **מסך 3 – פרטים בסיסיים (Basic Info):** הזנת שם מלא, העלאת תמונת פרופיל, בחירת עיר מגורים. (כפתור "דלג" זמין).
* **מסך 4 – תחומי עניין (Interests Selection):** בחירה מתוך רשימה ויזואלית. (כפתור "דלג" זמין).
* **מסך 5 – אימות תעודת זהות (ID Verification):** העלאת צילום ת"ז. (כפתור "דלג" זמין).
* **מסך 6 – ברוכים הבאים (Welcome Tour):** סקירה אינטראקטיבית של 3-4 יכולות מרכזיות (החלקות). כפתור "התחל" מעביר לפיד.

---

### זרימה 2: גלישה כאורח וחסימת פעולות
**תיאור:** אדם גולש ללא הרשמה וניסה לבצע פעולה אקטיבית.
* **מסך 1 – דף נחיתה:** לוחץ "המשך כאורח".
* **מסך 2 – פיד ראשי (מצב אורח):** צופה בפוסטים ציבוריים. כפתורי פעולה (תרומה, צ'אט, עקיבה) מופיעים אך עם אייקון מנעול.
* **מסך 3 – פופ-אפ חסימה (Guest Block Modal):** בלחיצה על כל פעולה אקטיבית, מוקפץ חלון: "כדי לתרום/לעזור/ליצור קשר – יש להירשם לקהילה". כפתורים: "הירשם עכשיו" / "אחר כך".

---

### זרימה 3: יצירת פוסט לבקשת עזרה אנונימית (שידוכים)
**תיאור:** משתמש זקוק לעזרה רגישה ואינו רוצה להיחשף.
* **מסך 1 – פיד ראשי:** לוחץ על כפתור "+" צף או "בקש עזרה".
* **מסך 2 – יצירת פוסט (Create Post):** מזין טקסט, בוחר קטגוריה ותגיות.
* **מסך 3 – בחירת רמת פרטיות (Privacy Selection):** בוחר "רמה 1 – מוקדנים בלבד" עם אייקון מנעול והסבר חסיות.
* **מסך 4 – אישור שליחה (Success):** הודעה מרגיעה: "הבקשה הועברה בביטחה למוקד. מוקדן יטפל בה בסודיות מלאה." הפוסט לא מופיע בפיד.

---

### זרימה 4: טיפול מוקדן בפנייה רגישה (שידוכים)
**תיאור:** מוקדן מקבל פנייה, מוצא מתנדב ומבצע שידוך.
* **מסך 1 – סביבת עבודת מוקדן (Operator Queue):** רואה תור פניות. לוחץ על פנייה ובוחר "קח בעלות".
* **מסך 2 – תיק הפנייה (Case Detail):** פרטי המבקש, חיפוש מתנדב מתאים לפי אזור ותחום. לוחץ "הצע שידוך".
* **מסך 3 – שיח שידוך ובירור התאמה (Match Engagement Chat):** המתנדב מקבל Push/הודעה מהמוקדן. נפתח חלון צ'אט ייעודי שבו המוקדן מציג את הצורך, מנהל שיח, מברר התאמה ומנסה לרתום את המתנדב. אין חשיפה של זהות המבקש בשלב זה.
* **מסך 4 – עדכון והעשרת פרופיל (Profile Enrichment Update):** המוקדן מעדכן בתיק המשתמש של המתנדב פרטים חדשים שעלו בשיחה (למשל: "מעדיף סיוע לקשישים", "בעל רכב גדול לשינוע"). המשתמש מקבל התראה: "המוקדן הוסיף יכולות/תחומי עניין חדשים לפרופיל שלך בעקבות השיחה". למשתמש יש אפשרות לצפות בנתונים אלו ולערוך אותם בהגדרות.
* **מסך 5 – צ'אט שידוך (Private Match Chat):** הסכמה הדדית (בלחיצה על כפתור אישור בתוך הצ'אט) ← חשיפת שמות ← מעבר לתיאום ישיר.
* **מסך 6 – סגירת תיק (Case Closure):** המוקדן מסכם את הטיפול, מסמן סטטוס ורושם הערות. התיק נסגר ומתועד.

---

### זרימה 5: מסירת חפץ עם שינוע
**תיאור:** מסירת ספה גדולה עם תיאום שינוע אוטומטי.
* **מסך 1 – מסירת חפץ (Item Publish):** העלאת תמונה, תיאור, בחירת "דורש אישור מוסר".
* **מסך 2 – רשימת מעוניינים (Reservation Requests):** משתמשים מבקשים את החפץ. המוסר מאשר אחד.
* **מסך 3 – הקפצת שינוע (Transport Prompt):** "מעולה! התיאום בוצע. ליצור בקשת שינוע?" כפתור "כן" / "אתאם בעצמי".
* **מסך 4 – טופס שינוע מקוצר (Transport Form):** גודל חפץ, כתובת יעד. נשלח אוטומטית לפיד נסיעות עם כל המידע הרלוונטי למתנדב.

---

### זרימה 6: פרסום נסיעה שיתופית
**תיאור:** נהג מציע טרמפ עם השתתפות בהוצאות.
* **מסך 1 – פיד נסיעות (Rides Feed):** לוחץ "הצע נסיעה".
* **מסך 2 – הגדרת נסיעה (Publish Ride):** מוצא, יעד (מפה), שעה, מושבים פנויים.
* **מסך 3 – אופציות שינוע ותשלום (Options Modal):** סימון "מוכן לשנע חפצים". בחירה: חינם / השתתפות בהוצאות + סכום.
* **מסך 4 – לוח בקרת נסיעה (Ride Dashboard):** נסיעה מתוכננת, אישור/דחיית נוסעים וחפצים, מפה מסכמת.

---

### זרימה 7: הצטרפות לנסיעה כנוסע
**תיאור:** משתמש מחפש טרמפ ומצטרף לנסיעה קיימת.
* **מסך 1 – פיד נסיעות:** סינון לפי מוצא, יעד ותאריך.
* **מסך 2 – פרטי נסיעה (Ride Detail):** פרטי הנהג, מסלול, עלות, מושבים פנויים. כפתור "בקש להצטרף".
* **מסך 3 – אישור בקשה (Request Confirmation):** "הבקשה נשלחה לנהג. תקבל התראה כשיאשר."
* **מסך 4 – התראת אישור (Ride Approval Notification):** Push: "הנהג אישר את ההצטרפות!" מעבר ללוח בקרת הנסיעה.

---

### זרימה 8: השתתפות באתגר קהילתי-שיתופי
**תיאור:** הצטרפות לאתגר "מועדון 5 בבוקר".
* **מסך 1 – לובי אתגרים (Challenges Lobby):** גלילה וצפייה. לחיצה על "מועדון 5 בבוקר".
* **מסך 2 – פרטי אתגר (Challenge Details):** תיאור, 1,200 משתתפים, כפתור "הצטרף לאתגר".
* **מסך 3 – צ'אט ודיווח יומי (Challenge Hub):** למחרת בבוקר – Push "קמת?". דיווח מהיר (Check-in) + צ'אט קבוצתי. אנימציית עידוד.
* **מסך 4 – לוח הישגים (Leaderboard):** רצפים, דירוגים, השוואה לחברי הקבוצה.

---

### זרימה 9: יצירת אתגר חדש
**תיאור:** משתמש מאומת יוצר אתגר קהילתי חדש.
* **מסך 1 – לובי אתגרים:** לוחץ "צור אתגר חדש".
* **מסך 2 – טופס יצירת אתגר (Create Challenge):** שם, תיאור, משך, יעד, קטגוריה, ציבורי/פרטי.
* **מסך 3 – תצוגה מקדימה (Preview):** כך ייראה האתגר למשתתפים. כפתור "פרסם".
* **מסך 4 – אישור פרסום:** "האתגר פורסם!" עם אפשרות שיתוף.

---

### זרימה 10: גילוי אנשים ועקיבה
**תיאור:** משתמש מחפש חברים חדשים בקהילה.
* **מסך 1 – גילוי אנשים (Discover People):** רשימת משתמשים מומלצים (לפי אזור, תחומי עניין, פעילות).
* **מסך 2 – פרופיל משתמש (User Profile):** כרטיס ביקור, סטטיסטיקות, היסטוריית פעילות. כפתור "עקוב".
* **מסך 3 – רשימת עוקבים/נעקבים (Followers):** צפייה ברשת הקשרים עם אפשרות מעבר לפרופילים.

---

### זרימה 11: תרומה כספית ישירה לעמותה
**תיאור:** משתמש נכנס לפרופיל עמותה ותורם.
* **מסך 1 – פרופיל עמותה (NGO Profile):** צפייה במידע, מדדי עשייה. כפתור בולט "תרום".
* **מסך 2 – טופס תרומה (Donation Form):** בחירת סכום (מוגדרים מראש + הזנה חופשית), שם התורם (אפשרות לאנונימי), הקדשה אישית.
* **מסך 3 – אישור ותשלום (Payment Confirmation):** סיכום ואישור.
* **מסך 4 – תודה ואישור (Thank You):** הודעת תודה, קבלה דיגיטלית, הצעה לשתף את התרומה בפיד.

---

### זרימה 12: הצטרפות כמתנדב לארגון
**תיאור:** משתמש רוצה להתנדב רשמית בעמותה.
* **מסך 1 – פרופיל עמותה:** כפתור "התנדב".
* **מסך 2 – טופס הצטרפות (Volunteer Application):** פרטים, זמינות, תחומי עניין, ניסיון קודם.
* **מסך 3 – אישור שליחה:** "הבקשה נשלחה לאישור הארגון. נעדכן אותך."
* **מסך 4 – אישור מנהל ארגון (Org Side):** מנהל הארגון רואה בלוח הבקרה בקשה חדשה ומאשר/דוחה.
* **מסך 5 – התראת אישור (למתנדב):** "התקבלת כמתנדב בעמותת X!" שינוי סטטוס אוטומטי בפרופיל.

---

### זרימה 13: Onboarding ארגון חדש
**תיאור:** עמותה חדשה מבקשת להצטרף לפלטפורמה.
* **מסך 1 – דף נחיתה / הגדרות:** קישור "הצטרף כארגון".
* **מסך 2 – טופס הצטרפות ארגון (Org Onboarding):** שם הארגון, מספר עמותה, תיאור, תחומי פעילות, פרטי קשר, מסמכים נלווים.
* **מסך 3 – המתנה לאישור:** "הבקשה הועברה לאישור הנהלת הפלטפורמה."
* **מסך 4 – אישור/דחייה (Admin Side):** מנהל מערכת בוחן את הבקשה במסך AdminOrgApprovals ומאשר/דוחה.
* **מסך 5 – אישור ופתיחת לוח בקרה:** "הארגון אושר!" → גישה ללוח בקרה ארגוני + עמוד עמותה ציבורי.

---

### זרימה 14: תרומת ידע – העלאת קורס
**תיאור:** משתמש מומחה מעלה קורס דיגיטלי חינמי.
* **מסך 1 – קטגוריית ידע (Knowledge Screen):** לוחץ "תרום ידע".
* **מסך 2 – בחירת סוג (Knowledge Type):** קורס / שיעור פרטי / טקסט-כתבה / סרטון.
* **מסך 3 – טופס קורס (Course Builder):** כותרת, תיאור, שיעורים (רשימת פרקים), העלאת חומרים.
* **מסך 4 – שליחה לאישור:** "הקורס נשלח לאישור הנהלת הארגון."
* **מסך 5 – אישור/דחייה:** מנהל מעיין בתוכן ומאשר. הקורס מופיע בקטגוריית הידע.

---

### זרימה 15: שיחת צ'אט חדשה
**תיאור:** משתמש יוזם שיחה פרטית עם משתמש אחר.
* **מסך 1 – פרופיל משתמש / רשימת צ'אטים:** לוחץ "שלח הודעה".
* **מסך 2 – יצירת שיחה (New Chat):** בחירת/אימות נמען.
* **מסך 3 – מרחב הצ'אט (Chat Detail):** כתיבת הודעה ראשונה ושליחה.

---

### זרימה 16: דיווח על תוכן פוגעני
**תיאור:** משתמש רואה פוסט בעייתי ומדווח.
* **מסך 1 – פוסט בפיד:** לוחץ על תפריט נקודות (⋮) → "דווח".
* **מסך 2 – פופ-אפ דיווח (Report Modal):** בחירת סיבה (ספאם, תוכן פוגעני, הטעיה, אחר) + שדה הערות.
* **מסך 3 – אישור דיווח:** "הדיווח התקבל ויטופל בהקדם." הפוסט מוסתר מהמדווח.
* **צד מנהל (Admin Review):** הדיווח מגיע למסך AdminReview לבחינה ופעולה.

---

### זרימה 17: ניהול משימות ארגוניות (Admin)
**תיאור:** מנהל ארגון יוצר ומנהל משימה.
* **מסך 1 – לוח בקרה ארגוני (Org Dashboard):** כפתור "צור משימה חדשה".
* **מסך 2 – יצירת משימה (Task Form):** כותרת, תיאור, תאריך יעד, שיוך לצוות/אדם, עדיפות, תתי-משימות.
* **מסך 3 – רשימת משימות (Tasks List):** צפייה בכל המשימות, סינון לפי סטטוס/אדם, עדכון התקדמות.
* **מסך 4 – דיווח שעות (Time Tracking):** מתנדב/עובד מדווח שעות על המשימה.

---

### זרימה 18: שימוש בעוזר AI
**תיאור:** משתמש משתמש בעוזר AI כדי למצוא התנדבות מתאימה.
* **מסך 1 – חיפוש + AI (Search Screen):** לוחץ על אייקון העוזר.
* **מסך 2 – שיחה עם AI:** "אני מחפש התנדבות באזור תל אביב בתחום החינוך". AI מציג תוצאות מותאמות.
* **מסך 3 – לחיצה על תוצאה:** מעבר ישיר לפרופיל עמותה / פוסט רלוונטי.

---

### זרימה 19: התאמת עיצוב אישי של האפליקציה
**תיאור:** משתמש משנה את מראה האפליקציה שלו.
* **מסך 1 – הגדרות / פרופיל:** לוחץ "התאם עיצוב".
* **מסך 2 – חלון UI Customization:** סקלת צבעים, תצוגות, ספריית עיצובים של משתמשים אחרים.
* **מסך 3 – תצוגה מקדימה:** כך תיראה האפליקציה. "אישור" / "חזרה לברירת מחדל".

---

### זרימה 20: הסתרת תוכן וניהול מסננים
**תיאור:** משתמש רוצה להסתיר סוג מסוים של פוסטים מהפיד שלו.
* **מסך 1 – פוסט בפיד:** תפריט (⋮) → "הסתר".
* **מסך 2 – פופ-אפ הסתרה (Hide Options Modal):** "הסתר פעם אחת" / "הסתר תמיד פוסטים מסוג זה". האלגוריתם מציע חסימה לפי קטגוריה או סטטוס.
* **מסך 3 – ניהול מסננים (Settings > Filters):** צפייה בכל המסננים הקבועים, עריכה ומחיקה.

<section dir="ltr" lang="en">

### 4.1 Additive SRS-alignment flows and edge cases

The flows above remain valid product narratives. The following additive flows clarify gaps found during the May 2026 review and should be read together with `docs/SSOT/SRS/functional/*`, especially posts, operator matching, Shiduchim Tov, donations, notifications, and users.

#### Flow 21: Four-level anonymity selection during post creation
**Description:** A user creates a post and chooses the exact visibility level required by the SRS.
* **Screen 1 - Create Post:** User selects Give or Receive (`give` / `request`), category, description, location granularity, and optional metadata.
* **Screen 2 - Anonymity Level Selector:** User sees four options: Level 1 operators only, Level 2 operators + followers with masked identity, Level 3 public redacted, Level 4 fully public.
* **Screen 3 - Contextual explanation:** The UI explains who can see identity, who can contact the author, and whether the post enters the operator queue.
* **Screen 4 - Confirmation:** The success message confirms both the post intent and the selected anonymity level.
* **Edge case:** For Level 3/4 posts, the author may later request operator help manually; for Level 1/2 posts, queue routing is automatic.

#### Flow 22: Level 3 public-redacted post contact path
**Description:** A user sees a public-redacted post and wants to help without receiving direct PII.
* **Screen 1 - Feed / Post Detail:** The post is visible but author name, avatar, exact address, and contact details are redacted.
* **Screen 2 - Contact through platform:** The primary contact action opens a moderated request or platform-mediated chat request instead of direct DM.
* **Screen 3 - Author notification:** The author receives a minimal notification and can decide whether to continue through platform mediation, ask an operator for help, or decline.
* **Screen 4 - Resolution:** If the author chooses to reveal details, the reveal is explicit and logged as a one-way privacy decision.

#### Flow 23: Shiduchim Tov non-operator explainer
**Description:** A regular user opens the Good Matching entry from the Donations area.
* **Screen 1 - Donations categories:** User selects Shiduchim Tov / Good Matching, distinct from the romantic Matchmaking category.
* **Screen 2 - Explainer view:** The service explains social-good matching, operator assistance, privacy levels, and aggregate impact stats only.
* **Screen 3 - CTA:** User taps "Create a private request" and is sent to post creation with Level 1 preselected, or chooses "Learn more" for FAQ content.
* **Safety rule:** No queue item, requester identity, candidate identity, or operator-only data is shown to non-operators.

#### Flow 24: Operator workspace and queue triage
**Description:** An operator opens Shiduchim Tov and handles assigned cases.
* **Screen 1 - Operator Queue:** Operator sees Level 1 and Level 2 queue items plus Level 3/4 posts where the author requested help manually.
* **Screen 2 - Claim:** Operator claims one item; the case becomes assigned to that operator and the claim is audit-logged.
* **Screen 3 - Case Detail:** Operator views full requester details, need description, urgency, internal notes, and candidate search.
* **Screen 4 - Candidate proposal:** Operator contacts a candidate with a scoped need description and no requester identity.
* **Screen 5 - Mutual acceptance:** Only after both sides accept are names/contact details revealed or an in-app mediated chat is opened.
* **Screen 6 - Completion or retry:** Accepted cases move toward completed; declined proposals return the case to in-progress for another candidate.

#### Flow 25: Operator profile enrichment consent loop
**Description:** An operator adds candidate capability details learned during a conversation.
* **Screen 1 - Match engagement chat:** Candidate shares availability, preferences, skills, vehicle capacity, sensitivities, or constraints.
* **Screen 2 - Profile enrichment form:** Operator records structured tags and a short note.
* **Screen 3 - Candidate notification:** Candidate receives an in-app notification describing what was added and why.
* **Screen 4 - Candidate control:** Candidate can approve, edit, hide, or delete the enrichment from personal settings.
* **Privacy rule:** Enriched information is used for future matching and is not shown publicly unless the user explicitly exposes it.

#### Flow 26: Donation payment intent versus actual processing
**Description:** A user wants to donate money, but the current SRS gap states no payment gateway exists yet.
* **Screen 1 - NGO Profile:** User taps "Donate".
* **Screen 2 - Donation form:** User selects amount, anonymity preference, dedication, and target organization.
* **Screen 3 - MVP handling:** If payment processing is not integrated, the UI records donation intent, shows clear "not charged yet" wording, and routes the user to the approved external/manual payment path.
* **Screen 4 - Future handling:** Once a payment provider is approved, the same flow may proceed to secure payment confirmation and receipt issuance.
* **Business rule:** The UI must never imply that money was transferred if the system only stored intent.

#### Flow 27: Organization onboarding implementation-status handling
**Description:** An organization applies to join while the full organization API may still be incomplete.
* **Screen 1 - Org onboarding:** The applicant submits organization details, registration number, contact details, documents, and activity areas.
* **Screen 2 - Submission result:** The system confirms receipt only if the request is actually stored or sent to an approved review workflow.
* **Screen 3 - Admin review:** Admin/Super Admin reviews, approves, rejects, or requests more information.
* **Screen 4 - Partial implementation guard:** If persistence or review workflow is not available, the product must show a transparent pending/manual-process message instead of presenting a false automated approval path.

#### Flow 28: Offline or degraded connectivity behavior
**Description:** A user loses connectivity while using core flows.
* **Screen 1 - Network loss:** The app shows a non-blocking offline/degraded banner.
* **Screen 2 - Safe read mode:** Cached public content may remain visible with a "last updated" indicator.
* **Screen 3 - Write actions:** Sensitive writes such as Level 1/2 requests, payment intent, operator case notes, role changes, and PII edits require online confirmation and should not be silently queued without clear user confirmation.
* **Screen 4 - Recovery:** When connectivity returns, the user sees which actions succeeded, failed, or still require retry.

#### Flow 29: Reported content with hidden or private posts
**Description:** A user reports content that may have restricted visibility.
* **Screen 1 - Report modal:** User chooses reason and optional details.
* **Screen 2 - Reporter view:** The reported content is hidden from the reporter immediately where appropriate.
* **Screen 3 - Admin moderation:** Admin/Super Admin receives the report and can view the full post according to moderation policy, including restricted posts where allowed by audit and privacy rules.
* **Screen 4 - Privacy-preserving outcome:** The reporter receives a generic outcome notification when policy allows, without exposing private author details or moderation internals.

</section>

---
*הפרק הבא: [5. מיפוי מסכים ותצוגות מקיף](./05_Screen_UI_Mapping.md)*
*חזרה ל[אינדקס ראשי](./00_Index.md)*

</div>
