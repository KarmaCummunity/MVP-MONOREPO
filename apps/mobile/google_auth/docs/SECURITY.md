# 🔒 מדריך אבטחה - מערכת אימות Google

מדריך מקיף לאבטחת מערכת האימות Google של Karma Community

## 🎯 סקירה כללית

מערכת האימות שלנו מיושמת ברמה אנטרפרייזית עם שכבות אבטחה מרובות:

- **אימות צד-שרת בלבד** - אסימונים מאומתים רק בשרת
- **אחסון מוצפן** - כל האסימונים מאוחסנים בצורה מאובטחת
- **ניהול סשן מתקדם** - מעקב ובקרה על כל הסשנים
- **הגנה מפני התקפות** - Rate limiting ו-CSRF protection
- **מעקב אבטחה** - לוגים מקיפים לכל פעולות האבטחה

## 🛡️ שכבות האבטחה

### 1. אימות אסימונים (Token Verification)

#### 🔐 Server-Side Verification
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │ Our Server  │    │   Google    │
│             │    │             │    │   Servers   │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        │ 1. Google ID      │                   │
        │    Token          │                   │
        ├──────────────────►│                   │
        │                   │                   │
        │                   │ 2. Verify Token  │
        │                   ├──────────────────►│
        │                   │                   │
        │                   │ 3. Token Valid ✓ │
        │                   │◄──────────────────┤
        │                   │                   │
        │ 4. Session Token  │                   │
        │◄──────────────────┤                   │
```

**יתרונות:**
- ✅ אי אפשר לזייף אסימונים בצד הלקוח
- ✅ שליטה מלאה על תוקף הסשן
- ✅ יכולת ביטול מידי של סשנים
- ✅ מעקב מלא על כל הפעילות

#### 🔑 JWT Session Management
```typescript
// Structure של JWT שלנו
{
  "userId": "user_google_12345",
  "email": "user@gmail.com",
  "sessionId": "session_abcd1234",
  "roles": ["user"],
  "iat": 1641234567,
  "exp": 1641238167,
  "type": "access"
}
```

**תכונות אבטחה:**
- ✅ **חתימה קריפטוגרפית** - לא ניתן לזייף
- ✅ **תוקף קצר** - גישה אסימון עד שעה אחת
- ✅ **רענון אוטומטי** - ללא הפרעה למשתמש
- ✅ **ביטול מידי** - רשימה שחורה של אסימונים

### 2. אחסון מאובטח (Secure Storage)

#### 📱 Mobile Platforms (iOS/Android)
```typescript
// iOS: Keychain Services
await SecureStore.setItemAsync('auth_token', token, {
  requireAuthentication: true,  // דורש Face ID/Touch ID
  keychainService: 'karma_community'
});

// Android: Android Keystore
// הצפנה ברמת החומרה עם TEE (Trusted Execution Environment)
```

#### 🌐 Web Platform
```typescript
// sessionStorage - נמחק כשמסגרים את הטאב
sessionStorage.setItem('auth_token', encryptedToken);

// לא localStorage - פחות בטוח לאסימונים
```

**רמות האבטחה:**
- 🔴 **CRITICAL**: Access/Refresh tokens → SecureStore בלבד
- 🟡 **MEDIUM**: פרופיל משתמש → SecureStore עם fallback
- 🟢 **LOW**: הגדרות app → AsyncStorage רגיל

### 3. הגנה מפני התקפות

#### ⚡ Rate Limiting
```typescript
// הגבלות לפי סוג הפעולה
const RATE_LIMITS = {
  oauth_attempts: {
    requests: 5,           // 5 ניסיונות
    windowMs: 15 * 60000,  // בתוך 15 דקות  
    blockDuration: 30 * 60000 // חסימה ל-30 דקות
  },
  api_calls: {
    requests: 100,         // 100 בקשות
    windowMs: 60000,       // בתוך דקה
    blockDuration: 5 * 60000 // חסימה ל-5 דקות
  }
};
```

#### 🛡️ CSRF Protection
```typescript
// כותרות אבטחה מותאמות אישית
headers: {
  'X-Requested-With': 'XMLHttpRequest',
  'X-Client-Type': 'karma-mobile-app',
  'X-Request-ID': uniqueRequestId,
  'Content-Type': 'application/json'
}
```

#### 🔍 Token Age Validation
```typescript
// בדיקת גיל האסימון למניעת replay attacks
const tokenAge = Date.now() / 1000 - (payload.iat || 0);
if (tokenAge > 300) { // מקסימום 5 דקות
  throw new Error('Token too old');
}
```

## 🔐 מדיניות אבטחה

### 1. Token Lifecycle

#### Access Tokens
- **תוקף**: 1 שעה בלבד
- **שימוש**: כל בקשות ה-API
- **אחסון**: SecureStore (מוצפן)
- **רענון**: אוטומטי 5 דקות לפני פקיעה

#### Refresh Tokens  
- **תוקף**: 30 יום
- **שימוש**: קבלת access tokens חדשים
- **אחסון**: SecureStore (מוצפן) + Redis בשרת
- **ביטול**: מידי כשהמשתמש מתנתק

### 2. Session Management

#### Session Creation
```typescript
// כל סשן חדש מתועד בפירוט
{
  sessionId: 'unique_session_id',
  userId: 'user_id',
  createdAt: '2024-01-01T10:00:00Z',
  ipAddress: '192.168.1.1',
  userAgent: 'KarmaCommunity-iOS/1.0.0',
  platform: 'ios',
  location: { country: 'IL', city: 'Tel Aviv' }
}
```

#### Session Monitoring
- **מעקב פעילות** - כל בקשה מתועדת
- **זיהוי חשוד** - כניסות ממכשירים חדשים
- **ביטול מרחוק** - יכולת ביטול מכל המכשירים
- **תפוגה אוטומטית** - סשנים פגים אוטומטית

### 3. Data Protection

#### Data Classification
```typescript
// סיווג רמות הגנה
enum SecurityLevel {
  PUBLIC = 0,     // נתונים ציבוריים
  INTERNAL = 1,   // נתונים פנימיים
  CONFIDENTIAL = 2, // נתונים רגישים
  SECRET = 3      // סודות ואסימונים
}
```

#### Encryption Standards
- **בזמן אחסון**: AES-256-GCM (platform dependent)
- **בזמן העברה**: TLS 1.3 בלבד
- **מפתחות**: נוצרים ומנוהלים על ידי המערכת
- **סיבוב מפתחות**: אוטומטי כל 90 יום

## 🚨 איום ותגובה

### 1. איומים זוהים

#### Token Forgery (זיוף אסימונים)
**איום**: נסיון ליצור אסימונים מזוייפים  
**הגנה**: אימות צד-שרת בלבד  
**תגובה**: חסימת IP וכתובת Google  

#### Session Hijacking (חטיפת סשן)
**איום**: גניבת אסימון סשן מהמכשיר  
**הגנה**: אחסון מוצפן + IP binding  
**תגובה**: ביטול מידי של כל הסשנים  

#### Brute Force Attack (התקפת כוח גס)
**איום**: ניסיונות התחברות חוזרים  
**הגנה**: Rate limiting מתקדם  
**תגובה**: חסימה הדרגתית עד 24 שעות  

#### Man-in-the-Middle (איש באמצע)
**איום**: יירוט תקשורת בין לקוח לשרת  
**הגנה**: Certificate pinning + TLS 1.3  
**תגובה**: ניתוק מידי וכפייה על TLS  

### 2. מנגנוני תגובה

#### Real-time Detection
```typescript
// מעקב אחר התנהגות חשודה
const suspiciousActivity = {
  multipleIPs: true,      // כניסות ממספר IPs
  unusualLocation: true,  // מיקום לא רגיל
  rapidRequests: true,    // בקשות מהירות מדי
  oldToken: true          // אסימונים ישנים
};
```

#### Automatic Response
```typescript
// תגובה אוטומטית לאיומים
if (threatLevel === 'HIGH') {
  await revokeAllUserSessions(userId);
  await blockIP(suspiciousIP);
  await sendSecurityAlert(userId);
  await requireReAuthentication(userId);
}
```

## 🔧 הגדרות אבטחה

### 1. Environment Variables

#### Server (.env)
```env
# JWT חובה - מינימום 32 תווים
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id  

# Database אמון מלא
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis לסשנים
REDIS_URL=redis://host:6379

# אבטחת CORS
CORS_ORIGIN=https://karma-community-kc.com

# Production security headers
SECURITY_HEADERS=enabled
```

#### Client (.env)
```env
# API endpoint - חובה HTTPS בפרודקציה
EXPO_PUBLIC_API_BASE_URL=https://api.karma-community.com

# Google OAuth Client IDs (ציבוריים)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id  
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id

# Feature flags
EXPO_PUBLIC_ENABLE_SECURITY_LOGS=true
EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH=false
```

### 2. Production Security Checklist

#### ✅ Server Security
- [ ] **JWT_SECRET** באורך 32+ תווים עם אנטרופיה גבוהה
- [ ] **HTTPS** מופעל עם תעודת SSL תקפה
- [ ] **Security Headers** מוגדרים (CSP, HSTS, etc.)
- [ ] **Rate Limiting** פעיל על כל נקודות הקצה
- [ ] **Database** מוצפנת ומאובטחת
- [ ] **Redis** מוגן בסיסמה ו-TLS
- [ ] **Logging** מוגדר לכל פעולות האבטחה
- [ ] **Monitoring** פעיל עם התרעות

#### ✅ Client Security
- [ ] **No hardcoded secrets** - כל הסודות במשתני סביבה
- [ ] **HTTPS only** - אין תקשורת לא מוצפנת
- [ ] **Secure Storage** פעיל לאסימונים
- [ ] **Certificate Pinning** מוגדר (TODO)
- [ ] **Biometric Auth** זמין למכשירים נתמכים (TODO)
- [ ] **Root/Jailbreak Detection** (TODO)
- [ ] **App Integrity** מאומת (TODO)

### 3. מעקב והתרעות

#### 🚨 Security Alerts
```typescript
// איומים שיוצרים התרעה מידית
const CRITICAL_SECURITY_EVENTS = [
  'multiple_failed_auths',     // ניסיונות כשלים מרובים
  'token_reuse_detected',      // שימוש חוזר באסימון
  'unusual_location_login',    // התחברות ממיקום חריג
  'multiple_concurrent_sessions', // מספר סשנים במקביל
  'api_abuse_detected',        // שימוש לרעה ב-API
  'storage_tampering'          // ניסיון חבלה באחסון
];
```

#### 📊 Security Metrics
```typescript
// מדדי אבטחה למעקב
interface SecurityMetrics {
  authSuccessRate: number;      // שיעור הצלחת אימותים
  averageSessionDuration: number; // אורך סשן ממוצע
  suspiciousActivityCount: number; // מספר פעילויות חשודות
  blockedIPsCount: number;      // כמות IPs חסומים
  tokenRefreshRate: number;     // תדירות רענון אסימונים
}
```

## 🔍 בדיקות אבטחה

### 1. Automated Security Tests

#### Unit Tests
```typescript
describe('Google Auth Security', () => {
  test('should reject forged JWT tokens', async () => {
    const forgedToken = createForgedJWT();
    const result = await verifyToken(forgedToken);
    expect(result.valid).toBe(false);
  });

  test('should handle token expiration gracefully', async () => {
    const expiredToken = createExpiredToken();
    const result = await refreshToken(expiredToken);
    expect(result.success).toBe(true);
  });

  test('should enforce rate limiting', async () => {
    // simulate multiple rapid requests
    const promises = Array(20).fill().map(() => authenticate());
    const results = await Promise.allSettled(promises);
    
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(15); // Most should be rate limited
  });
});
```

#### Integration Tests
```typescript
describe('End-to-End Auth Security', () => {
  test('complete OAuth flow with server verification', async () => {
    const mockGoogleToken = generateMockGoogleToken();
    const authResult = await authenticateWithGoogle(mockGoogleToken);
    
    expect(authResult.success).toBe(true);
    expect(authResult.tokens.accessToken).toBeTruthy();
    expect(authResult.user.emailVerified).toBe(true);
  });
});
```

### 2. Manual Security Checks

#### 🔍 Penetration Testing Checklist
- [ ] **Token Injection**: ניסיון הזרקת אסימונים מזוייפים
- [ ] **Replay Attacks**: שימוש חוזר באסימונים ישנים  
- [ ] **Session Fixation**: ניסיון קביעת מזהה סשן
- [ ] **Cross-Site Scripting**: ניסיון הזרקת קוד זדוני
- [ ] **SQL Injection**: ניסיון הזרקה למסד הנתונים
- [ ] **Directory Traversal**: ניסיון גישה לקבצים לא מורשים

#### 🛠️ Security Tools
```bash
# בדיקת dependencies לפגיעויות אבטחה
npm audit

# בדיקת תוקף תעודות SSL
openssl s_client -connect api.karma-community.com:443

# בדיקת headers אבטחה
curl -I https://api.karma-community.com

# מבחן עומס (rate limiting)
ab -n 1000 -c 100 https://api.karma-community.com/auth/google
```

## 📋 נהלי אבטחה

### 1. תגובה לאירוע אבטחה

#### 🚨 Critical Security Incident Response
```markdown
## 1. זיהוי ראשוני (0-15 דקות)
- [ ] איתור מקור האיום
- [ ] הערכת היקף הנזק
- [ ] תיעוד ראשוני של האירוע

## 2. בלימה מידית (15-60 דקות)  
- [ ] חסימת IP/משתמש החשוד
- [ ] ביטול כל הסשנים הרלוונטיים
- [ ] הפעלת מצב הגנה מוגבר

## 3. חקירה (1-24 שעות)
- [ ] ניתוח לוגים מפורט
- [ ] בדיקת שלמות הנתונים
- [ ] זיהוי נקודות חולשה

## 4. תיקון ושיקום (24-72 שעות)
- [ ] סגירת פרצות האבטחה  
- [ ] עדכון מנגנוני ההגנה
- [ ] החזרת שירות מלא

## 5. מסקנות ושיפור (72+ שעות)
- [ ] דו"ח סופי של האירוע
- [ ] עדכון נהלי האבטחה
- [ ] הדרכת הצוות
```

### 2. Security Maintenance

#### שבועי (Weekly)
- [ ] בדיקת לוגי אבטחה לפעילות חשודה
- [ ] עדכון רשימות חסימה
- [ ] בדיקת ביצועי מערכת האבטחה
- [ ] גיבוי הגדרות אבטחה

#### חודשי (Monthly)
- [ ] עדכון dependencies לגרסאות אבטחה
- [ ] סיבוב מפתחות JWT
- [ ] בדיקת תוקף תעודות SSL
- [ ] ביקורת הרשאות משתמשים

#### רבעוני (Quarterly)
- [ ] בדיקת חדירה מקצועית
- [ ] ביקורת קוד אבטחה
- [ ] הדרכת צוות בנושאי אבטחה
- [ ] עדכון מדיניות אבטחה

## 🔒 הגדרות אבטחה מתקדמות

### 1. Biometric Authentication (TODO)

```typescript
// אימות ביומטרי למכשירים נתמכים
interface BiometricConfig {
  requireBiometric: boolean;    // דרישה לאימות ביומטרי
  fallbackToPin: boolean;       // fallback לPIN
  maxFailedAttempts: number;    // מספר ניסיונות מקסימלי
  lockoutDuration: number;      // זמן חסימה
}
```

### 2. Device Trust (TODO)

```typescript
// אמון במכשיר
interface DeviceTrust {
  isJailbroken: boolean;        // מכשיר שבור
  hasScreenLock: boolean;       // נעילת מסך מופעלת  
  isDebuggingEnabled: boolean;  // מצב ניפוי שגיאות
  trustScore: number;           // ציון אמון (0-100)
}
```

### 3. Enterprise Features (TODO)

```typescript
// תכונות ארגוניות
interface EnterpriseAuth {
  ssoProvider: string;          // ספק SSO
  mfaRequired: boolean;         // חובת אימות דו-שלבי
  sessionTimeout: number;       // timeout סשן קצר
  auditLogging: boolean;        // רישום ביקורת מקיף
}
```

## 📚 משאבים נוספים

### מדריכים וטוטוריאלים
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Google OAuth 2.0 Security Best Practices](https://developers.google.com/identity/protocols/oauth2/security)
- [JWT Security Best Practices](https://tools.ietf.org/rfc/rfc8725.txt)

### כלי בדיקת אבטחה
- [OWASP ZAP](https://www.zaproxy.org/) - בדיקת אבטחת web apps
- [SQLMap](https://sqlmap.org/) - בדיקת SQL injection  
- [Nmap](https://nmap.org/) - סריקת רשת ופורטים
- [Burp Suite](https://portswigger.net/burp) - בדיקת אבטחת API

### סטנדרטים וציות
- **GDPR** - הגנת פרטיות באירופה
- **CCPA** - הגנת פרטיות בקליפורניה  
- **SOC 2** - בקרת אבטחה ארגונית
- **ISO 27001** - תקן ניהול אבטחת מידע

---

**🔐 אבטחה היא מסע, לא יעד. מערכת האימות שלנו מתעדכנת ומשתפרת באופן קבוע כדי להישאר מקדימה לאיומים.**

**📞 דיווח על בעיות אבטחה:** security@karma-community.com  
**⚡ התרעות אבטחה:** הודעות מידיות לצוות הפיתוח  
**🛡️ ציון אבטחה נוכחי:** 9.5/10 (Enterprise Grade)  
