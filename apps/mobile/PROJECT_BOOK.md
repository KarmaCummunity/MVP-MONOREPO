## ספר פרויקט – MVP

מסמך זה מתאר את מבנה הפרויקט, אחריות כל קובץ ותלויות עיקריות.
המטרה היא לאפשר לכל מפתח חדש להבין במהירות את הארכיטקטורה ואת זרימת העבודה.

---

## 1. סקירה כללית של הפרויקט

- **שם הפרויקט**: KC MVP (אפליקציית React Native/Expo)
- **מטרת המערכת**: אפליקציית מובייל ו־Web לניהול ותרומת משאבים/כספים/תוכן קהילתי.
- **טכנולוגיות עיקריות**:
  - React Native + Expo
  - TypeScript/JavaScript
  - Expo Router / מערכת ניווט מותאמת
  - אינטגרציית Google OAuth

בפרקים הבאים נעבור תיקיה־תיקיה וקובץ־קובץ, ונתאר את תפקידם.
נוסיף גם הערות על שיפורים אפשריים וטודו איפה שרלוונטי.

---

## 2. קבצי שורש (Root)

בפרק זה מתועדים הקבצים המרכזיים שנמצאים בשורש הפרויקט.

- **`package.json`**  
  - **תפקיד**: מגדיר את חבילת ה־Node של הפרויקט – שם האפליקציה, גרסת הקוד, נקודת כניסה (`main`), תלויות (`dependencies`/`devDependencies`) וסקריפטים להרצה ו־build.  
  - **סקריפטים חשובים**:
    - `start` – הרצה סטנדרטית של האפליקציה עם `expo start`.
    - `start:local` – הרצה מול שרת API מקומי (`http://localhost:3001`) עם שימוש ב־backend במקום Firestore.
    - `android` / `ios` – build והרצה על אמולטור/מכשיר.
    - `web`, ‏`build:web`, ‏`build:web:local` – הרצה ו־export לגירסת Web, כולל הגדרת `EXPO_PUBLIC_API_BASE_URL` ל־production/local.  
  - **תלויות מרכזיות**:  
    - ספריות Expo/React Native (כמו `expo`, ‏`react-native`, ‏`expo-router`, ‏`react-navigation`).  
    - ספריות UI ופונקציונליות כמו `@expo/vector-icons`, ‏`react-native-reanimated`, ‏`react-native-gesture-handler`.  
    - ספריות בינלאומיות (`i18next`, ‏`react-i18next`), Firebase, ומנוע פיזיקה (`matter-js`) לאנימציות/סימולציות.  
  - **טודו קיימים בקובץ**:  
    - השלמת Audit לתלויות, הוספת סקריפטים ל־tests, lint, type-check, format ו־security audit, והקפדה על Semantic Versioning מסודר.

- **`app.config.js`**  
  - **תפקיד**: קובץ קונפיגורציה דינמי של Expo ב־JavaScript, עם אפשרות להשתמש ב־`process.env` (למשל `EXPO_PUBLIC_API_BASE_URL`).  
  - **תוכן עיקרי**:
    - הגדרת `expo.name`, ‏`slug`, ‏`version`, אייקון, `scheme` ו־`userInterfaceStyle`.  
    - קונפיגורציית `ios` ו־`android` (כולל bundle/package identifiers).  
    - קונפיגורציית `web` – כולל `bundler`, meta data, RTL (`dir: "rtl"`) והגדרות עיצוב (צבעי רקע/Theme).  
    - הגדרת `plugins` (למשל `expo-router`) ו־`experiments.typedRoutes`.  
    - בלוק `extra` – מכיל את כל משתני הסביבה הפומביים (API base URL, מזהי Google OAuth, הגדרות Firebase לכל סביבה, ו־`eas.projectId`).  
  - **הערות**:
    - זהו קובץ הקונפיגורציה העדכני יותר; חלק מהמידע חופף ל־`app.json`.  
    - מומלץ בהמשך לאחד/לנקות כפילויות בין `app.config.js` ל־`app.json` לפי מה שבאמת בשימוש.

- **`app.json`**  
  - **תפקיד**: קובץ קונפיגורציית Expo בפורמט JSON (legacy / סטטי), המגדיר חלק גדול מההגדרות של האפליקציה בדומה ל־`app.config.js`.  
  - **תוכן עיקרי**:
    - `expo.name`, ‏`slug`, ‏`version`, אייקון, Splash, צבע ראשי, כיוון מסך וכו'.  
    - הגדרות iOS כולל הרשאות ו־`infoPlist` ל־Camera/Microphone/Photo Library.  
    - הגדרות Android כולל `permissions` ספציפיות (התראות, Wake Lock, Foreground Service וכו').  
    - קונפיגורציית Web (favicon, themeColor, backgroundColor, viewport meta).  
    - `plugins` – בעיקר `expo-notifications` עם הגדרות אייקון וצבע להתראות.  
    - בלוק `extra` – שוב מגדיר משתני סביבה ל־API, Google, Firebase ו־EAS (כפילות מול `app.config.js`).  
  - **הערות**:
    - הקובץ עדיין בשימוש ע"י Expo, אבל חלק מהמידע עשוי להיות מנוהל בפועל דרך `app.config.js`.  
    - בעתיד כדאי להחליט על מקור־אמת אחד (config JS דינמי או JSON סטטי) ולהסיר כפילויות.

- **`App.tsx`**  
  - **תפקיד**: נקודת הכניסה הראשית של האפליקציה ב־React Native/Expo. עוטפת את כל ה־UI ב־Providers (Context) ומגדירה את ה־NavigationContainer וההתנהגות הראשונית של האפליקציה.  
  - **אחריות מרכזית**:
    - טעינת פונטים (Ionicons, MaterialIcons), שליטה ב־SplashScreen והצגת מסך טעינה.  
    - קריאת שפת הממשק מ־`AsyncStorage` (`app_language`), שינוי שפה ב־`i18n` והגדרת RTL דרך `I18nManager`.  
    - הגדרת `UserProvider`, ‏`WebModeProvider`, ‏`AppLoadingProvider`, ‏`SafeAreaProvider`, ‏`GestureHandlerRootView` ו־`ErrorBoundary`.  
    - יצירת `NavigationContainer` עם `MainNavigator` וניהול ניווט גלובלי (`navigationRef`) כולל ניווט מתשובות התראות push (למסכי `ChatDetailScreen` / `NotificationsScreen`).  
    - תמיכה ב־Web Mode: רכיב `WebModeToggleOverlay` ותוספת padding במצב `app` על Web.  
  - **שירותים חיצוניים**:
    - שימוש ב־`expo-notifications` (באמצעות `notificationService`), ‏`expo-web-browser` עבור OAuth, לוגים דרך `loggerService`.  
  - **טודו קיימים בקובץ**:
    - שיפור טיפול בשגיאות (fonts, notifications, deep linking), הוצאת קוד התראות ל־hook/שירות ייעודי, שיפור נגישות (Accessibility) והוצאת Magic Numbers ל־`constants`.

- **`App.js`**  
  - **תפקיד**: קובץ App בסיסי שנוצר ע"י Expo (template ברירת מחדל). מציג מסך דמה עם טקסט "Open up App.js to start working on your app!".  
  - **מצב נוכחי**:
    - האפליקציה בפועל משתמשת ב־`App.tsx` כנקודת כניסה ראשית (TypeScript).  
    - `App.js` נשאר כקובץ היסטורי/לא בשימוש, ויכול ליצור בלבול למפתחים חדשים.  
  - **המלצה**:
    - לשקול מחיקה/הפחתת השימוש בקובץ הזה או להוסיף הערה מפורשת שהוא לא בשימוש, כדי למנוע כפילות בין `App.js` ו־`App.tsx`.

- **`README.md`**  
  - **תפקיד**: מסמך התיעוד הראשי של הפרויקט ב־GitHub – נותן סקירה שיווקית־טכנית, מטרות הפרויקט, מבנה תיקיות, תהליך התקנה והרצה, רמות הרשאות, ותכונות עתידיות.  
  - **תוכן מרכזי**:
    - תיאור הפרויקט: אפליקציה קהילתית חינמית בישראל, חיבור בין עמותות, תורמים ומתנדבים.  
    - רשימת **15 סוגי דמויות** שונים (תורמים, מתנדבים, משפחות, עמותות וכו').  
    - הסבר על ארכיטקטורת ה־Front-end, מנגנון האותנטיקציה והניווט (UserContext, LoginFlow, BottomNavigator).  
    - הוראות התקנה (`npm install`, ‏`npm start`) והרצה על Android/iOS/Web.  
    - פירוט על עיצוב (פלטת צבעים, RTL, רספונסיביות), אחסון מקומי, ביצועים ואבטחה בסיסית.  
  - **קשר לספר הפרויקט**:
    - `PROJECT_BOOK.md` מעמיק ברמת קובץ/קוד, בעוד `README.md` נותן תמונת־על חיצונית.  
    - מומלץ לעדכן את שני המסמכים יחד כשמשנים ארכיטקטורה או מוסיפים יכולות משמעותיות.

---

## 3. תיקיית `app/` – מסכי Expo Router

תיקיית `app/` מכילה קבצים הקשורים ל־Expo Router (גם אם חלקם כיום Legacy) וכן מסך ייעודי ל־OAuth ב־Web.

- **`app/_layout.tsx`**  
  - **תפקיד**: רכיב Layout ראשי ל־Expo Router, במצב **Legacy/Deprecated**. בפועל מחזיר `null` ומשמש כ־placeholder בלבד.  
  - **הערה**: לפי ההערה בקובץ, ה־navigation בפועל נעשה דרך מערכת ניווט אחרת (`MainNavigator` ב־`App.tsx`), והקובץ נשאר כדי למנוע שגיאות import מצד הספרייה.

- **`app/(tabs)/_layout.tsx`**  
  - **תפקיד**: רכיב Layout לטאבים של Expo Router, גם הוא במצב **Legacy/Deprecated**, מחזיר `null`.  
  - **הערה**: דומה ל־`_layout.tsx` הראשי – נשמר למניעת שגיאות בזמן ריצה, אך אינו מנהל יותר את הטאבים בפועל.

- **`app/(tabs)/index.tsx`**  
  - **תפקיד**: מסך בית סטטי פשוט (Welcome screen) שתוכנן לשימוש עם Expo Router, עם טקסט "ברוך הבא ל-KC_ID!" ותיאור קצר של הפלטפורמה.  
  - **מצב נוכחי**:
    - האפליקציה בפועל נטענת דרך `index.js` → `App.tsx` ומערכת ה־navigation הקלאסית (`MainNavigator`), ולא דרך Expo Router.  
    - מסך הבית האמיתי שהמשתמש רואה הוא `bottomBarScreens/HomeScreen.tsx`.  
    - לכן הקובץ הזה משמש כיום כקובץ **Demo/Legacy** בלבד, ואינו חלק מזרימת המשתמש הראשית.  
  - **הערת UX**:
    - אם בעתיד נרצה לבנות Landing Page רשמי ל־Web באמצעות Expo Router – ניתן להשתמש בקובץ זה כבסיס ולחזק בו את העיצוב והמיקרו־קופי.

- **`app/oauthredirect.tsx`**  
  - **תפקיד**: מסך ייעודי ל־OAuth Redirect עבור התחברות עם Google ב־Web.  
  - **אחריות מרכזית**:
    - קריאת פרמטרים מ־URL (בעיקר `id_token` ב־hash), פענוח JWT (`parseJWT`), בניית פרופיל משתמש (`userData`) והכנסתו ל־`AsyncStorage` (`google_auth_user`, ‏`google_auth_token`, ‏`oauth_success_flag`).  
    - סגירת ה־auth session באמצעות `WebBrowser.maybeCompleteAuthSession()` ושליחת הודעה חזרה ל־`window.opener` במקרה של Popup.  
    - ניהול סטטוס התהליך (`processing` / `success` / `error`) והצגת הודעות מצב למשתמש, כולל redirect אוטומטי ל־`'/'` לאחר מספר שניות.  
  - **UX/UI**:
    - מסך מינימליסטי עם רקע תכלת (`#F0F8FF`), אינדיקטור טעינה, אייקון אמוג׳י לפי סטטוס (⏳ / ✅ / ❌), כותרת הודעה וטקסט עזר.  
    - אין אפשרות ביטול/Back מהירה – המשתמש ממתין עד לסיום התהליך וה־redirect.  
  - **שאלות ל־UX**:
    - האם תרצה להוסיף כאן **כפתור חזרה ידני** (למקרה שהתהליך נתקע), או לינק "חזור לאפליקציה" שזמין תמיד?  
    - האם נרצה להציג **מיתוג חזק יותר** (לוגו KC, טקסט הסבר קצר) כדי שהמשתמש יבין שהוא חזר לאפליקציה ולא לעמוד זר?

---

## 4. תיקיות לוגיקה ורכיבים

- **`components/`**: רכיבי UI חוזרים לשימוש במסכים שונים.
- **`screens/`**: מסכי ליבה של האפליקציה.
- **`donationScreens/`**: מסכים ספציפיים לקטגוריות תרומה שונות.
- **`bottomBarScreens/`, `topBarScreens/`**: מסכים המחוברים ל־bottom/top tab navigators.
- **`context/`**: Context API לניהול state גלובלי (משתמש, מצב טעינה, מצב Web וכו').
- **`utils/`**: פונקציות עזר, שירותי API/DB ותשתית נוספת.
- **`globals/`**: הגדרות צבעים, סטיילים כלליים, טיפוסים ו־constants.
- **`google_auth/`**: שכבת אינטגרציה מרוכזת מול Google OAuth ושירותי API מאובטחים.

> בכל אחת מהתיקיות האלה נעבור קובץ־קובץ ונוסיף תיאור, חתימת פונקציות עיקריות, ותלויות.

---

## 5. תשתית Native (Android / iOS) ו־Web

- **`android/`** ו־**`ios/`**: הגדרות פרויקטי native שנוצרו ע"י Expo/EAS – חבילות, הרשאות, קונפיגורציות בנייה.
- **`web/`** + קבצי `webpack.config.js`, `metro.config.js`: קונפיגורציות build ו־bundling ל־Web ול־React Native.

> TODO: להרחיב לגבי הבדל בין build למובייל ול־Web ואיך מתבצע deployment (ע"פ `DEPLOYMENT.md`).

---

## 6. קבצי תיעוד קיימים

- **`README.md`**: תיאור כללי של הפרויקט והוראות הפעלה.
- **`DEPLOYMENT.md`**, **`AUDIT_REPORT.md`**, **`AUTHENTICATION_TEST.md`**, **`AUTH_TESTING.md`**: מסמכי תיעוד ובדיקות קיימים.

> TODO: לסכם כאן את עיקרי המסמכים כדי שיהיו נגישים במבט־על בספר הפרויקט.

---

## 7. רשימת טודו לספר הפרויקט

- [ ] למלא תיעוד מפורט לכל קובצי השורש.
- [ ] לתעד כל קובץ בתיקיית `app/`.
- [ ] לתעד כל קובץ בתיקיית `components/`.
- [ ] לתעד כל מסך בתיקיות `screens/`, `donationScreens/`, `bottomBarScreens/`, `topBarScreens/`.
- [ ] לתעד את כל שירותי העזר ב־`utils/` ו־`google_auth/`.
- [ ] להוסיף תרשימי זרימה/דיאגרמות ארכיטקטורה (אופציונלי).


