<div dir="rtl" lang="he">

## 📱 3. פיצ'רים ותהליכי ליבה (Core Features)

### 3.1. כניסה, אימות זהות וניהול פרופיל

#### 3.1.1 אפשרויות התחברות
* **כניסה מהירה (SSO):** Google, Apple, Facebook.
* **כניסה עם מספר טלפון:** שליחת קוד OTP חד-פעמי.
* **כניסה קלאסית:** דוא"ל וסיסמה (כולל "שכחתי סיסמה").
* **כניסה כאורח:** צפייה בלבד בתכנים ציבוריים. בכל ניסיון לפעולה אקטיבית – הקפצת הודעה מזמינה להרשמה עם הסבר יתרונות.

<section dir="ltr" lang="en">

**Additive SRS alignment note:** The implementation-facing SRS currently confirms email/password, Google OAuth, Firebase Auth, and guest mode as active authentication paths. Apple, Facebook, and phone OTP remain valid product intentions in this PRD, but each should be treated as an integration-dependent capability that requires explicit SRS and implementation confirmation before release commitment.

</section>

#### 3.1.2 תהליך Onboarding (הרשמה ראשונית)
לאחר ההרשמה הראשונית, המשתמש מופנה לתהליך בניית פרופיל מודרך. **ניתן לדלג על התהליך בכל שלב באמצעות כפתור "דלג"**, ובמקרה כזה המשתמש יופנה ישירות לפיד עם התראה קבועה להשלמת הפרטים החסרים.
1. **שלב 1 – פרטים בסיסיים:** שם מלא, תמונת פרופיל, עיר מגורים.
2. **שלב 2 – תחומי עניין:** בחירה מרשימת קטגוריות (מזון, בגדים, חינוך, רפואה וכו') – משפיע על התאמת הפיד.
3. **שלב 3 – אימות תעודת זהות:** העלאת צילום ת"ז. עד להשלמה – הפרופיל במצב "לא מאומת", מוצגת התראה קבועה, ואין "וי כחול".
4. **שלב 4 – הסבר קצר:** מסך "ברוכים הבאים" עם סקירה מהירה של 3-4 יכולות מרכזיות.

#### 3.1.3 פרופיל אישי
* **כרטיס ביקור:** תמונה, שם, וי כחול (אם אומת), עיר, ביוגרפיה קצרה, **תצוגת תפקיד נוכחי (למשל: "מתנדב", "מנהל מתנדבים")**.
* **פעולות מבוססות תפקיד:** אפשרות לשלוח בקשות ייעודיות למשתמש בהתאם לתפקידו (למשל: בקשת הצטרפות לצוות ממנהל מתנדבים, בקשת עזרה ממוקדן וכו').
* **סטטיסטיקות אישיות:** כמות תרומות, שעות התנדבות, רצפים באתגרים.
* **רשת קשרים:** עוקבים, נעקבים, "קשרי שייכות" לארגונים.
* **היסטוריית פעילות:** לשוניות – פוסטים פתוחים, פוסטים סגורים, פוסטים מתויגים.
* **פעולות:** עריכת פרופיל, שיתוף פרופיל, ניהול הגדרות פרטיות.

#### 3.1.4 פרופיל עמותה (מנקודת מבט משתמש)
* כפתור פעולה ראשי בולט: "התנדב" או "תרום" ישירות לעמותה.
* אזור מידע: תיאור, מיקום, תחומי פעילות, מדדי עשייה.
* קיר עדכונים – פוסטים שפורסמו בשם הארגון.
* רשימת מתנדבים פעילים (גלויים בלבד).

#### 3.1.5 עריכת פרופיל עמותה (מנהלים ועובדים)
* **פיצ'ר זה זמין לעמותות במנוי בלבד (בתשלום חודשי).**
* פאנל Drag & Drop להוספת כפתורים, טקסטים, באנרים.
* העלאת לוגו וכיסוי (Cover).
* כל שינוי משפיע על התצוגה הציבורית לכל המשתמשים.

#### 3.1.6 חוויה מותאמת אישית (UI Customization)
* משתמשים יכולים לשנות את נראות האפליקציה (צבעים, עיצובים) באמצעות שיחה עם עוזר ה-AI.
* כל שינוי נשמר ברמת המשתמש בלבד.
* כפתור "חזרה לגרסה המקורית" זמין תמיד.
* קטגוריית תרומה ייחודית: "עיצוב האפליקציה" – משתמשים משתפים עיצובים, מעתיקים מאחרים, שומרים גרסאות.

---

### 3.2. הפיד החברתי וניהול התוכן

#### 3.2.1 הפיד הראשי (Main Feed)
* **אלגוריתם תצוגה:** שילוב ציר זמן ורלוונטיות (מיקום גיאוגרפי, תחומי עניין, היסטוריית פעילות).
* **סוגי תוכן בפיד:** בפיד יוצגו כל סוגי הפוסטים מכל הקטגוריות. 
* **נראות הפוסטים:** בפיד רואים את הפוסטים, ובכל פוסט יהיה ברור האם מדובר בפוסט נתינה (הצעה) או פוסט בקשה.
* **טוגל חברים/כולם:** בפיד יש כפתור טוגל הקובע האם לראות את הפוסטים של כולם או רק של החברים שלי (משתמשים שאני עוקב אחריהם).
* **סינון ומיון מתקדם:** בפיד יהיה כפתור שיפתח חלון של כל אפשרויות הסינון, המיון והחיפוש המתקדמים.
* **סטטיסטיקות:** כפתור ייעודי למעבר מהיר למסך הסטטיסטיקות.

<section dir="ltr" lang="en">

**Additive SRS alignment — Give / Receive intent:** Every donation-context post should carry an explicit `give` or `request` intent. UI labels should use Give / Receive (`לתת / לקבל`) instead of legacy Offerer / Seeker terminology. Feed cards should expose clear badges, chips, icons, or colors so users can distinguish giving offers from requests at a glance.

**Open requests in giving context:** Category pages in give mode should surface a collapsible "Open Requests" section above or near the publishing form. This lets donors see real needs before creating a new offer and keeps requests visible beyond the chronological feed.

</section>

#### 3.2.2 חיפוש ועוזר AI אישי
* **שורת חיפוש חופשי:** חיפוש טקסטואלי/מילולי בכל סוגי התוכן.
* **סינון קטגוריאלי:** עשרות מסננים מובנים (קטגוריה, תאריך, אזור, סטטוס).
* **עוזר AI אינטראקטיבי:** צ'אט-בוט המסייע להתמצאות, ממליץ על התנדבויות רלוונטיות, עוזר למצוא תוכן ספציפי.
* **חיפוש קולי:** אפשרות לחפש באמצעות דיבור.

#### 3.2.3 הסתרת פוסטים ומסננים קבועים
* **הסתרת פוסט עצמי:** הצעה לשנות רמת אנונימיות במקום הסתרה מוחלטת.
* **הסתרת פוסט של אחרים:** בחירה – הסתרה חד-פעמית או מסנן קבוע. האלגוריתם מזהה האם לחסום לפי קטגוריה או לפי סטטוס.
* **ניהול מסננים אישיים:** מסך ייעודי בהגדרות לצפייה ועריכת כל המסננים הקבועים.

#### 3.2.4 התראות ו-Push Notifications
* **סוגי התראות:** הצעות שידוך, אישורי מסירה, תזכורות אתגר, הודעות צ'אט חדשות, עוקבים חדשים, עדכוני סטטוס לפניות.
* **ניהול התראות:** מסך מרכזי לצפייה בכל ההתראות, סימון כנקראו, מעבר ישיר לתוכן רלוונטי.
* **הגדרות התראות:** אפשרות לכבות/להדליק/להגדיר כל סוג התראה בנפרד.

---

### 3.3. אנונימיות ופרטיות מובנית (3 רמות)


| רמה | שם             | מי רואה             | מה נחשף                                 | אופן יצירת קשר          |
| --- | -------------- | ------------------- | --------------------------------------- | ----------------------- |
| 🛡️ 1 | למוקדנים בלבד  | צוות המוקדנים בלבד  | הכל (שם, פרטים מלאים)                   | רק דרך המוקדן           |
| 👥 2 | עוקבים בלבד    | עוקבים (החברים שלי) | פוסט רגיל לחלוטין (פרטים מלאים לעוקבים) | ישירות דרך הפרופיל/צ'אט |
| 🌍 3 | ציבורי לחלוטין | כולם (ברירת מחדל)   | פוסט רגיל לחלוטין (פרטים מלאים לכולם)   | ישירות דרך הפרופיל/צ'אט |

**כללים נוספים:**
* ברירת המחדל היא רמה 3 (ציבורי).
* בפוסטים ברמה 1, לא ניתן לקחת בעלות ללא מעורבות מוקדן.
* לאחר פרסום, ניתן להעלות רמת חשיפה (להפוך לפומבי יותר) אך לא להוריד.

<section dir="ltr" lang="en">

#### 3.3.1 Additive SRS alignment — four anonymity levels

The SRS defines four implementation-facing anonymity levels. The three-level model above should remain as product background, but design and implementation should align to the following expanded model:

| Level | Product meaning | Visibility and identity behavior | Operator routing |
| ----- | --------------- | -------------------------------- | ---------------- |
| 1 | Operators only | Full content and requester identity are visible only to operators and authorized admins. Hidden from public feed, follower feed, search, and public profile lists. | Automatically enters the operator queue. |
| 2 | Operators + followers | Operators see full context. Followers may see a scoped/redacted version; non-followers and guests do not see the post. | Automatically enters the operator queue. |
| 3 | Public limited | Public feed visibility with strong identity redaction: approximate location only, anonymized author placeholder, no direct profile or DM access. | Not automatic; the author may request operator help manually. |
| 4 | Fully public | Standard public post behavior with visible author identity and normal feed inclusion. | Not automatic. |

**Default level:** Level 4 is the SRS default for new and existing posts unless the user explicitly chooses another level.

**Important correction to preserve in future UX:** Level 3 is not "fully public"; it is public but redacted. Fully public behavior belongs to Level 4.

**Contact rule for Level 3:** Users should not be able to directly message the author from a redacted Level 3 post. The UI should show either a platform-mediated contact flow or a clear "contact unavailable" explanation.

**Changing levels:** Moving from a more private level to a more public one can reveal identity and may be irreversible in practice for users who already viewed the post. Moving into a more private level should remain possible unless an active matching case or policy restriction requires operator mediation.

</section>

---

### 3.4. מערך "שידוכים" (Operator Matching)

#### 3.4.1 מהות השירות
מוקד אנושי המטפל בבקשות רגישות בדיסקרטיות מלאה. חיבור בין מבקשי עזרה רגישים לבין מתנדבים מתאימים.

<section dir="ltr" lang="en">

**Terminology clarification:** This operator-assisted social-good service should be named and positioned as **Shiduchim Tov / Good Matching**. It is separate from the existing romantic/singles **Matchmaking** donation category. Shiduchim Tov connects community needs with volunteers or donors through trained operators; romantic matchmaking connects matchmakers with singles and should remain a separate category and screen.

</section>

#### 3.4.2 תהליך עבודת המוקדן
1. **קבלת פנייה:** פנייה מגיעה לתור מרמת אנונימיות 1.
2. **לקיחת בעלות (Claim):** מוקדן לוחץ "קח בעלות" – הפנייה ננעלת אליו.
3. **בחינת הפנייה:** המוקדן קורא את הפרטים, מוסיף הערות פנימיות.
4. **חיפוש מתנדב:** חיפוש לפי אזור גיאוגרפי, תחום, זמינות.
5. **יצירת קשר ושיח (Engagement):** המוקדן פונה למתנדב/תורם פוטנציאלי דרך הצ'אט. המטרה היא לא רק להציע, אלא לנהל שיח: להסביר את חשיבות הבקשה, לברר התאמה מדויקת, ולנסות לרתום את המתנדב לסיוע.
6. **העשרת פרופיל ודיוק יכולות (Profile Enrichment):** על בסיס השיחה, המוקדן מעדכן פרטים בתיק המשתמש של המתנדב (העדפות עומק, יכולות מיוחדות, רגישויות). המשתמש מקבל התראה על הנתונים החדשים שנוספו לפרופיל שלו וניתן לו החופש לערוך או למחוק אותם בהגדרות הפרופיל (תחת תחומי עניין ויכולות). מידע זה משמש את המערכת והמוקד לשידוכים עתידיים מדויקים יותר, ואינו גלוי למשתמשים אחרים ללא אישור המשתמש.
7. **הסכמה הדדית:** רק אם שני הצדדים מסכימים – נחשפות הזהויות המלאות (במידת הצורך) ונפתח צ'אט ישיר ביניהם.
8. **סגירת תיק:** לאחר סיום הטיפול – סגירה עם סיכום ותיעוד מלא.

<section dir="ltr" lang="en">

**Additive queue-routing correction:** The operator queue should receive Level 1 and Level 2 posts automatically. Level 3 and Level 4 posts should not enter the queue automatically, but their author may explicitly request operator assistance from the post or Shiduchim Tov entry screen.

**Candidate privacy rule:** Candidate volunteers/donors should receive only the minimum scoped need description before mutual acceptance. Requester identity, contact details, exact address, and other PII are revealed only after mutual acceptance or through platform-mediated contact according to policy.

</section>

#### 3.4.3 ניהול מנהל מוקדנים
* הקצאת משמרות וזמני עבודה.
* ניטור עומס ופיזור פניות.
* בקרת איכות – ביקורת אקראית על תיקים סגורים.
* העברת פניות בין מוקדנים.
* דו"חות ביצועים (זמני תגובה, שביעות רצון).

#### 3.4.4 Audit Trail
* כל פעולה מתועדת: מי, מתי, מה.
* היסטוריית שינויים בסטטוס התיק.
* רישום הערות פנימיות של מוקדנים.
* לא ניתן למחוק רשומות – רק להוסיף.

<section dir="ltr" lang="en">

**Additive audit and retention detail:** Operator audit logs should include queue views, case claims, case creation, status updates, candidate proposals, notes, reassignment, candidate responses, and every access to requester PII. Audit entries should be immutable from application code and retained for at least two years or longer where legal requirements apply.

**PII access logging:** Viewing requester identity for Level 1, 2, or internally enriched Level 3 posts should create an explicit `view_requester_pii` audit event. Operators must not copy requester PII into external systems, spreadsheets, or personal notes outside the platform.

</section>

---

### 3.5. עולמות תרומה (סוגי תרומות) וקטגוריות

הפלטפורמה מחלקת את סוגי התרומות השונים ל"עולמות תרומה". כל סוג תרומה (כגון כסף, ידע, חפצים, נסיעות, זמן) מהווה עולם שלם בפני עצמו עם לוגיקה ותהליכים ייעודיים.

#### 3.5.1 חלוקת הקטגוריות לעולמות
בתוך עולמות התרומה נמצאות הקטגוריות הממוקדות:
* **עולם החפצים (מסירת חפצים):** כולל קטגוריות כגון: בגדים, ספרים, רהיטים, אמנות, משחקים.
* **עולם הזמן (התנדבות וסיוע):** כולל קטגוריות כגון: תמיכה רגשית, בריאות הנפש, גיל הזהב, סביבה, חינוך, טכנולוגיה, תעסוקה. 
* **עולם האתגרים:** כולל קטגוריות כגון: ספורט, אתגרים קהילתיים, אתגרים אישיים, חידות.
* **עולמות וקטגוריות נוספים:** כסף, מזון, רפואה, דיור, בעלי חיים, מוזיקה, חידות, מתכונים, צמחים, פסולת/מיחזור, שידוכים, עיצובי האפליקציה.

#### 3.5.2 עולם הידע (Knowledge) – מודול מורחב
* **קורסים דיגיטליים:** משתמשים יכולים לבנות ולהעלות קורסים חינמיים שלמים (שיעורים, מבחנים, חומרי עזר).
* **שיעורים פרטיים:** הצעת שיעורים פרטיים (חינם) – התאמה לפי נושא ואזור.
* **טקסטים וכתבות:** העלאת תכנים כתובים מקצועיים.
* **סרטונים וקישורים:** שיתוף תוכן חינוכי חיצוני.
* **תהליך סינון ואימות:** כל מי שמבקש לתרום ידע חייב לעבור אישור מנהלת הארגון מראש.

<section dir="ltr" lang="en">

**Additive MVP alignment:** The SRS currently describes a narrower Knowledge MVP: public community knowledge links, an add-link flow, and a knowledge contribution request that creates an internal admin task. Direct course/video/file upload is a valid product expansion, but should be treated as a later phase unless the SRS is updated to include upload, moderation, storage, and publishing requirements.

**Approval model clarification:** The PRD approval rule above can coexist with the MVP model if it is scoped to rich knowledge contributions such as courses, private lessons, articles, or uploaded media. Simple public links may follow the SRS public-link model with admin deletion/moderation after submission.

</section>

---

### 3.6. נסיעות שיתופיות (Ride Sharing)

#### 3.6.1 סוגי נסיעות
* **הסעת אנשים:** טרמפים בין-עירוניים ועירוניים.
* **שינוע חפצים:** שליחת מטענים, חבילות, ואפילו רהיטים.
* **משולב:** נוסעים + חפצים באותה נסיעה.

#### 3.6.2 מודל תגמול
* **נסיעה חינמית:** ללא תשלום – התנדבות מלאה.
* **השתתפות בהוצאות:** סכום סמלי (דלק, בלאי) – ללא מטרות רווח. מודל קארפול פילנתרופי.

#### 3.6.3 תהליך פרסום נסיעה
קיימת אפשרות ל**פרסום מהיר** של נסיעה המבוסס על ערכי ברירת מחדל, עם אפשרות למעבר ל**הגדרות מתקדמות**.

**פרסום מהיר (ערכי ברירת מחדל):**
* **נקודת מוצא:** המיקום הנוכחי של המשתמש (ברירת מחדל).
* **יעד:** שדה חובה להזנה.
* **שעה ותאריך:** ברירת מחדל: עכשיו.
* **מקומות פנויים:** 3 מקומות (ברירת מחדל).
* **שינוע חפצים:** אין זמינות לשינוע חפצים (ברירת מחדל).
* **מודל תגמול:** נסיעה חינמית (ברירת מחדל).
* **פעולה:** המשתמש יכול ללחוץ על "פרסם" מיד לאחר הזנת היעד והתאריך, או לעבור ל"הגדרות מתקדמות".

**הגדרות מתקדמות:**
כניסה למסך הגדרות מורחב המאפשר למפרסם הנסיעה להגדיר מסננים ודרישות נוספות, כגון:
* בקשת מגדר ספציפי למצטרפים.
* אישור או איסור עישון במהלך הנסיעה.
* אישור או איסור העלאת בעלי חיים.
* מסננים והגדרות אופציונליות רבות נוספות להתאמה אישית של הנסיעה.

#### 3.6.4 ניהול נסיעה (לוח בקרה)
* צפייה בבקשות הצטרפות (נוסעים + חפצים).
* אישור/דחיית בקשות.
* צפייה במפה מסכמת של המסלול.
* סטטוס בזמן אמת.

---

### 3.7. מסירת חפצים (Items Delivery)

#### 3.7.1 מנגנוני מסירה
* **"כל הקודם זוכה":** ללא שריון – הראשון שמגיע לאסוף מקבל.
* **"דורש אישור מוסר":** המוסר בוחר למי למסור מתוך רשימת המעוניינים.

#### 3.7.2 פרטי פרסום חפץ
* תמונות החפץ (חובה תמונה אחת לפחות).
* תיאור ומצב החפץ.
* קטגוריה (רהיטים, בגדים, ספרים וכו').
* כתובת איסוף (ברירת מחדל: כתובת המוסר).
* מנגנון מסירה (כל הקודם / אישור).

#### 3.7.3 חיבור למערך השינוע
לאחר אישור מסירה, המערכת מזהה את גודל החפץ ומציעה:
* **חפץ קטן:** קישור לנסיעה שיתופית קיימת או יצירת בקשת שינוע.
* **חפץ כבד/מורכב:** פתיחת קריאה למתנדבים (נהג + סבל).
* **המשתמש יכול לסרב** ולתאם שינוע באופן עצמאי.

---

### 3.8. צ'אט ותקשורת (Chat & Messaging)

#### 3.8.1 יכולות צ'אט
* הודעות טקסט, תמונות, וידאו.
* הודעות קוליות.
* חיוויי קריאה (נקרא/לא נקרא) וחיוויי הקלדה.
* תגובות (Reactions) ולייקים על הודעות.
* שיתוף מיקום.
* שיתוף פוסטים מהפיד.

#### 3.8.2 סוגי שיחות
* **שיחה פרטית:** בין שני משתמשים.
* **צ'אט שידוך (משתמשים):** נפתח אוטומטית לאחר הסכמה הדדית בשידוך.
* **צ'אט עם מוקדן:** נפתח כאשר מוקדן יוצר קשר עם מתנדב בניסיון לבצע שידוך.
* **צ'אט תמיכה:** שיחה עם צוות התמיכה של הפלטפורמה.
* **צ'אט קבוצה ארגונית:** קבוצה ייעודית לעובדים ומתנדבים של אותו ארגון.
* **צ'אט קבוצתי פרויקטאלי:** נפתח סביב פרויקט התנדבותי קבוצתי בלבד.
* **צ'אט אתגר:** נפתח אוטומטית עם ההצטרפות לאתגר שיתופי.

#### 3.8.3 הגבלות צ'אט
* **אין יצירת קבוצות שרירותית** – קבוצות רק סביב פרויקט/אתגר.
* **צ'אט קבוצתי ננעל** להודעות חדשות לאחר סגירת הפרויקט/אירוע (ההיסטוריה נשארת קריאה).
* **אורחים אינם יכולים** לשלוח הודעות.

---

### 3.9. אתגרים (Challenges) והרגלים

#### 3.9.1 אתגרים אישיים (Habit Tracker)
* בניית הרגלים עם מעקב רצפים (Streaks).
* תזכורות Push אוטומטיות לדיווח.
* בעת שבירת רצף: דיווח סיבה + מצב רוח להפקת לקחים.
* סטטיסטיקות אישיות: אורך רצף נוכחי, רצף שיא, אחוז עמידה.

#### 3.9.2 אתגרים קהילתיים קבוצתיים
* יעדים קהילתיים (למשל: "1,000 תרומות מזון החודש").
* לוחות מובילים (Leaderboards) לעידוד.
* פרסים וירטואליים והכרה ציבורית.

#### 3.9.3 אתגרים אישיים-קהילתיים (שיתופיים)
* דוגמה: "מועדון ה-5 בבוקר".
* כל המצטרפים רואים דיווחים של שאר הקבוצה.
* צ'אט קבוצתי אוטומטי לחיזוק הדדי.
* דיווח יומי (Check-in) עם אנימציות עידוד.

#### 3.9.4 יצירת אתגר חדש
* כל משתמש מאומת יכול ליצור אתגר.
* הגדרות: שם, תיאור, משך, יעד, קטגוריה, ציבורי/פרטי/אישי.
* אתגר פרטי – רק מוזמנים יכולים להצטרף (קישור/קוד).

---

### 3.10. סטטיסטיקות עומק (Drill-Down Analytics)

#### 3.10.1 פילוסופיית התצוגה
* **שקיפות ללא עומס:** הפיד מציג ווידג'טים קומפקטיים (למשל: גרף חפצים שנמסרו).
* **לחיצה = העמקה:** לחיצה על ווידג'ט פותחת מסך עומק מלא.

#### 3.10.2 נתונים זמינים בעומק
* פילוח לפי זמן (יום, שבוע, חודש, שנה).
* פילוח לפי ערים ואזורים (כולל מפות חום).
* פילוח לפי קטגוריה.
* פילוח לפי ארגון/עמותה.
* מגמות לאורך זמן.
* השוואה בין תקופות.
* סטטיסטיקות אישיות מול קהילתיות.

---

### 3.11. מערכת ניהול עוטפת (ERP & CRM Back-Office)

#### 3.11.1 ניהול פנים-ארגוני
* **כספים ותרומות:** מעקב הכנסות והוצאות, דו"חות כספיים.
* **צוות עובדים ומתנדבים:** תיקים אישיים, סטטוס, שעות, ביצועים.
* **משימות ארגוניות:** יצירת משימות ותתי-משימות, הקצאה, דיווח שעות, מעקב סטטוס.
* **ניהול קבצים:** אחסון ושיתוף מסמכים ארגוניים.

#### 3.11.2 טבלאות דינמיות
* יצירת טבלאות מותאמות אישית ישירות מהממשק.
* הגדרת עמודות, סוגי נתונים, סינון ומיון.
* ייצוא נתונים.

#### 3.11.3 אינטגרציות חיצוניות
* קישוריות למערכות כגון Monday, Jira, Atlassian, Google Sheets וכו'.
* סנכרון דו-כיווני של משימות ונתונים.
* מטרה: לאפשר לעמותות מעבר הדרגתי ללא זניחת כלים קיימים.

---

### 3.12. התראות (Notifications System)

#### 3.12.1 סוגי התראות
* **פעולה נדרשת:** הצעת שידוך, בקשת אישור מסירה, בקשת הצטרפות לנסיעה.
* **עדכונים:** עוקב חדש, לייק על פוסט, תגובה לפוסט, עדכון סטטוס.
* **תזכורות:** תזכורת אתגר יומי, תזכורת השלמת פרופיל, תזכורת דיווח שעות.
* **מערכתיות:** עדכוני מדיניות, תחזוקה מתוכננת.

<section dir="ltr" lang="en">

**Additive operator notification types:** Shiduchim Tov requires operator-specific notifications, including: new queue item, candidate accepted/declined, case reassigned by admin, requester withdrew or deleted a post, and urgent case escalation. Notification copy must preserve anonymity by omitting requester identity until mutual acceptance or authorized operator/admin view.

</section>

#### 3.12.2 ניהול התראות
* מסך ריכוזי לכל ההתראות עם חלוקה לקטגוריות.
* סימון "נקרא" / "לא נקרא".
* לחיצה על התראה → מעבר ישיר למסך הרלוונטי.
* הגדרות אישיות: כיבוי/הדלקה לכל סוג בנפרד.

---

### 3.13. מועדפים וסימניות (Bookmarks)

* שמירת פוסטים, נסיעות, אתגרים וחפצים.
* מסך ייעודי לצפייה בכל הפריטים השמורים.
* סינון לפי קטגוריה.
* הסרת פריטים.

---

### 3.14. הגדרות אפליקציה (Settings)

* **פרופיל:** עריכת פרטים אישיים, שינוי סיסמה, ניהול אימות.
* **התראות:** הפעלה/כיבוי לפי סוג.
* **פרטיות:** ברירות מחדל לאנונימיות, חסימת משתמשים, ניהול מסננים.
* **שפה:** עברית / אנגלית.
* **נגישות:** גודל טקסט, ניגודיות.
* **אודות:** מידע על האפליקציה, תנאי שימוש, מדיניות פרטיות.
* **התנתקות / מחיקת חשבון.**

<section dir="ltr" lang="en">

**Additive accessibility detail:** Accessibility settings should also cover screen-reader labels for icon-only actions, logical focus order, keyboard/web navigation where relevant, dynamic text-size support, sufficient touch targets, safe-area handling, and RTL-first layout behavior for Hebrew with English fallback.

</section>

---

### 3.15 Offline, sync, and degraded network behavior

<section dir="ltr" lang="en">

The product should define what users can do when connectivity is unavailable or unstable:

* **Read-only cached experience:** Previously loaded feed items, profile basics, saved items, and recent notifications may remain visible with a clear "last updated" indicator.
* **Queued local actions:** Low-risk actions such as drafting a post, composing a message, or preparing a volunteer-hours report may be saved locally as drafts. They should be submitted only after the user confirms once connectivity returns.
* **Restricted sensitive actions:** Operator claims, match proposals, donation payments, privacy-level changes, account deletion, and identity verification should require live server confirmation and must not be silently queued.
* **Conflict handling:** If a locally drafted action references an entity that changed or was deleted on the server, the user should receive a clear resolution prompt rather than a silent failure.
* **Notification expectations:** The current SRS assumes push plus in-app polling. Product copy should avoid promising true real-time delivery unless a real-time transport is added.

</section>

---

### 3.16 Payment-processing status and donation money flow

<section dir="ltr" lang="en">

The financial donation flow in this PRD describes the desired user experience, but the SRS currently identifies payment-gateway processing as a gap. Until a gateway and compliance model are selected, the product should distinguish between:

* **Intent capture:** Recording a user's desire to donate and routing them to an organization-managed or external payment process.
* **External payment handoff:** Opening a trusted external provider or organization payment link, with platform-side confirmation only when reliable proof is available.
* **Native payment processing:** Full in-app payment, receipts, refunds, reconciliation, failed-payment handling, fraud checks, and financial reporting.

Any release that accepts money inside the platform must define supported providers, receipt ownership, refund policy, chargeback handling, compliance responsibilities, and whether the platform or the organization is merchant of record.

</section>

---
*הפרק הבא: [4. זרימות משתמש (User Flows)](./04_User_Flows.md)*
*חזרה ל[אינדקס ראשי](./00_Index.md)*

</div>
