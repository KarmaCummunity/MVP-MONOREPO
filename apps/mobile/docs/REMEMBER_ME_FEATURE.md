# תיעוד: פיצ'ר "זכור אותי" - Remember Me Feature

## סקירה כללית

מערכת ה-authentication עודכנה כדי לזכור את המשתמש באופן אוטומטי ללא צורך בהתחברות חוזרת בכל פעם שהאפליקציה נפתחת.

## איך זה עובד?

### 🔥 Firebase Auth Persistence

1. **התחברות עם Email/Password**:
   - Firebase Auth שומר אוטומטית את ה-session ב-AsyncStorage (React Native) או ב-LocalStorage (Web)
   - המשתמש נשאר מחובר עד שהוא מתנתק באופן מפורש
   - אין צורך לשמור סיסמה - Firebase מנהל tokens מאובטחים

2. **התחברות עם Google**:
   - Google OAuth מזין את ה-credentials ל-Firebase Auth
   - Firebase שומר את ה-session אוטומטית
   - המשתמש נשאר מחובר בין הפעלות של האפליקציה

### 🎯 מה שונה בקוד?

#### 1. UserContext.tsx
- **נוסף Firebase Auth Listener** (`onAuthStateChanged`):
  - מאזין לשינויים במצב ההתחברות של Firebase
  - משחזר אוטומטית את המשתמש כשהאפליקציה נפתחת
  - מסנכרן את UserContext עם Firebase Auth
  
```typescript
// שורות 95-178
useEffect(() => {
  const auth = getAuth(app);
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // משחזר session אוטומטית
      // יוצר userData ושומר ב-AsyncStorage
      // מעדכן את ה-context
    } else {
      // מנקה session רק אם היה משתמש Firebase
    }
  });
  return () => unsubscribe();
}, []);
```

- **עדכון signOut**:
  - מתנתק מ-Firebase Auth (שורה 391)
  - מנקה את כל ה-AsyncStorage
  - מעדכן את ה-context

#### 2. authService.ts
- **הוספת Auth Persistence**:
  - Web: `browserLocalPersistence` (localStorage)
  - React Native: AsyncStorage (ברירת מחדל)
  
```typescript
// שורות 43-51
if (Platform.OS === 'web') {
  setPersistence(authInstance, browserLocalPersistence);
} else {
  // React Native uses AsyncStorage by default
}
```

#### 3. SimpleGoogleLoginButton.tsx
- **אינטגרציה עם Firebase Auth**:
  - Google OAuth מזין עכשיו את ה-credentials ל-Firebase Auth
  - Firebase Auth Listener תופס את ההתחברות ושומר אותה
  - מאפשר session persistence אוטומטית
  
```typescript
// שורות 357-411
const credential = GoogleAuthProvider.credential(idToken);
await signInWithCredential(auth, credential);
// Firebase Auth listener יטפל בשאר אוטומטית
```

## מה המשתמש צריך לדעת?

### ✅ התנהגות חדשה

1. **אחרי התחברות מוצלחת**:
   - המשתמש נשאר מחובר גם אחרי סגירת האפליקציה
   - פתיחה מחדש של האפליקציה → מעבר ישיר למסך הבית
   - אין צורך להכניס שוב מייל וסיסמה

2. **התנתקות**:
   - יש ללחוץ על כפתור ההתנתקות במסך הפרופיל
   - זה ינקה את כל ה-session
   - בפעם הבאה יצטרך להתחבר מחדש

3. **אבטחה**:
   - הסיסמה **לא נשמרת** במכשיר
   - רק tokens מאובטחים של Firebase נשמרים
   - הזמן שהמשתמש נשאר מחובר תלוי ב-Firebase Auth (בד"כ 30 יום)

## בדיקות שצריך לעשות

### תרחישי בדיקה:

1. **התחברות עם Email/Password**:
   - [ ] התחבר עם מייל וסיסמה
   - [ ] סגור את האפליקציה לגמרי
   - [ ] פתח את האפליקציה מחדש
   - [ ] **ציפייה**: המשתמש כבר מחובר, מעבר ישיר למסך הבית

2. **התחברות עם Google**:
   - [ ] התחבר עם חשבון Google
   - [ ] סגור את האפליקציה
   - [ ] פתח מחדש
   - [ ] **ציפייה**: המשתמש כבר מחובר

3. **התנתקות**:
   - [ ] לחץ על כפתור התנתקות
   - [ ] **ציפייה**: מעבר למסך Login
   - [ ] סגור ופתח את האפליקציה
   - [ ] **ציפייה**: מופיע מסך Login (לא מחובר)

4. **מעבר בין מכשירים**:
   - [ ] התחבר במכשיר אחד
   - [ ] התנתק במכשיר אחר (דרך Firebase Console)
   - [ ] **ציפייה**: במכשיר הראשון יתנתק אוטומטית

## שינויים עתידיים אפשריים

### אפשרויות שלא מומשו (עדיין):

1. **Biometric Authentication**:
   - הוספת Face ID / Touch ID / טביעת אצבע
   - להוסיף שכבת אבטחה נוספת

2. **"זכור אותי ל-X ימים"**:
   - אפשרות לבחור משך זמן מותאם אישית
   - ברירת מחדל: 30 יום (Firebase)

3. **התראה על session פג תוקף**:
   - הצגת הודעה כשה-token פג תוקף
   - הצעה להתחבר מחדש

## קבצים שעודכנו

1. `/MVP/context/UserContext.tsx` - הוספת Firebase Auth listener
2. `/MVP/utils/authService.ts` - הגדרת persistence
3. `/MVP/components/SimpleGoogleLoginButton.tsx` - אינטגרציה עם Firebase Auth
4. `/MVP/docs/REMEMBER_ME_FEATURE.md` - התיעוד הזה

## שאלות נפוצות

**ש: כמה זמן המשתמש נשאר מחובר?**  
ת: ברירת המחדל של Firebase היא 30 יום. אחרי זה המשתמש יצטרך להתחבר מחדש.

**ש: מה קורה אם מישהו גונב לי את הטלפון?**  
ת: אפשר להתנתק מרחוק דרך Firebase Console או להוסיף בעתיד biometric authentication.

**ש: האם הסיסמה נשמרת במכשיר?**  
ת: לא! רק tokens מוצפנים של Firebase נשמרים. הסיסמה לעולם לא נשמרת.

**ש: איך מתנתקים?**  
ת: דרך כפתור ההתנתקות בהגדרות/פרופיל. זה ינקה את כל ה-session.

**ש: Google Sign-In עובד עכשיו?**  
ת: כן! Google Sign-In עודכן לעבוד עם Firebase Auth, מה שמאפשר גם session persistence אוטומטית.

---

**תאריך יצירה**: נובמבר 2025  
**גרסה**: 1.0  
**מעודכן לאחרונה**: 15.11.2025

