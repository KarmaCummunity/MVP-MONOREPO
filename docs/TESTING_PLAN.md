# תוכנית בדיקות אוטומטיות - KC MVP

**תאריך:** 30 דצמבר 2024  
**גרסה:** 1.0.0  
**מטרה:** הגנה על הסביבה האמיתית באמצעות בדיקות אוטומטיות מקיפות

---

## 📊 סקירה כללית

### המצב הנוכחי

**שרת (KC-MVP-server):**
- ✅ יש `@nestjs/testing` ב-devDependencies
- ❌ אין קבצי בדיקות
- ❌ אין סקריפטים להרצת בדיקות
- ✅ יש בדיקות ידניות (TEST_ENDPOINTS.md)

**פרונט (MVP):**
- ❌ אין framework בדיקות
- ❌ אין קבצי בדיקות
- ✅ יש audit scripts (לא בדיקות יחידה)
- ✅ יש authTestUtils (לא framework מלא)

**CI/CD:**
- ✅ יש GitHub Actions workflow בסיסי (check-env-separation)
- ❌ אין בדיקות אוטומטיות לפני deploy
- ❌ אין הגנה על production branch

---

## 🎯 מטרות

### 1. הגנה על Production
- **מניעת deploy** של קוד שבור ל-production
- **בדיקות חובה** לפני כל merge ל-main
- **אימות סביבה** - וידוא שמחובר ל-DB הנכון

### 2. איכות קוד
- **Unit Tests** - בדיקת פונקציות בודדות
- **Integration Tests** - בדיקת אינטגרציה בין רכיבים
- **E2E Tests** - בדיקת זרימות מלאות

### 3. מהירות פיתוח
- **Feedback מהיר** - בדיקות רצות אוטומטית
- **מניעת רגרסיות** - זיהוי בעיות לפני production
- **ביטחון בשינויים** - אפשר לעשות refactor בביטחון

---

## 🏗️ ארכיטקטורת בדיקות

### שכבות בדיקות

```
┌─────────────────────────────────────────┐
│         E2E Tests (End-to-End)          │  ← בדיקות מלאות של זרימות משתמש
│  - Authentication flow                  │
│  - Donation creation                    │
│  - Chat messaging                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      Integration Tests                  │  ← בדיקת אינטגרציה בין רכיבים
│  - API endpoints                        │
│  - Database operations                  │
│  - Redis caching                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Unit Tests                      │  ← בדיקת פונקציות בודדות
│  - Services                             │
│  - Utils                                │
│  - Components                           │
└─────────────────────────────────────────┘
```

---

## 🔧 שלב 1: הגדרת בדיקות לשרת

### 1.1 התקנת Dependencies

```bash
cd KC-MVP-server
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

### 1.2 קבצי תצורה

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    // Support for tsconfig-paths (כבר קיים בפרויקט)
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/main-improved.ts',
    '!src/minimal-server.ts',
    '!src/sanity.ts',
    '!src/**/*.module.ts',
    '!src/database/schema.sql',
    '!src/database/**/*.sql',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // חשוב: tsconfig.build.json כבר מוציא את **/*.spec.ts - זה בסדר
  // הבדיקות לא יכנסו ל-build
};
```

**הערות חשובות:**
- ✅ `tsconfig.build.json` כבר מוציא `**/*.spec.ts` - הבדיקות לא יכנסו ל-build
- ✅ יש `tsconfig-paths` בפרויקט - ה-Jest config תומך בזה
- ✅ יש `nest-cli.json` עם `sourceRoot: "src"` - זה תואם

### 1.3 עדכון package.json

הוספת scripts (ללא שינוי בסקריפטים הקיימים):
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:e2e": "jest --config jest.e2e.config.js"
  }
}
```

**הערות:**
- ✅ הסקריפטים הקיימים (start, build, check:env וכו') לא ישתנו
- ✅ הסקריפטים החדשים מתווספים בלבד

### 1.4 מבנה תיקיות

```
KC-MVP-server/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── auth.controller.spec.ts      ← בדיקות controllers
│   ├── services/
│   │   ├── user-resolution.service.ts
│   │   └── user-resolution.service.spec.ts  ← בדיקות services
│   └── ...
├── test/
│   ├── e2e/
│   │   └── auth.e2e-spec.ts             ← בדיקות E2E
│   ├── fixtures/
│   │   └── test-data.ts                 ← נתוני בדיקה
│   └── helpers/
│       └── test-db.ts                   ← עזרי בדיקה
└── jest.config.js
```

### 1.5 הגדרת Test Database

**חשוב מאוד - Test Database נפרד!**

צריך ליצור test database נפרד לחלוטין:
- ❌ לא להשתמש ב-production database
- ❌ לא להשתמש ב-development database
- ✅ ליצור database חדש: `kc_test_db`

**דוגמה ל-setup:**
```typescript
// test/helpers/test-db.ts
import { Pool } from 'pg';

export async function createTestDatabase(): Promise<Pool> {
  const testDbUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://kc:kc_password@localhost:5432/kc_test_db';
  
  const pool = new Pool({ connectionString: testDbUrl });
  
  // יצירת schema נקי לפני כל test suite
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  
  // הרצת schema.sql
  // ... (קריאת schema.sql והרצתו)
  
  return pool;
}

export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
}
```

**Environment variables לבדיקות:**
```bash
# .env.test (לא commit ל-git!)
TEST_DATABASE_URL=postgresql://kc:kc_password@localhost:5432/kc_test_db
TEST_REDIS_URL=redis://localhost:6379/1  # DB 1 לבדיקות
NODE_ENV=test
```

### 1.6 בדיקות ראשוניות לשרת

**עדיפות גבוהה:**
1. ✅ **AuthController** - בדיקת authentication endpoints
2. ✅ **Database operations** - בדיקת CRUD operations
3. ✅ **Environment validation** - בדיקת הפרדת סביבות
4. ✅ **Rate limiting** - בדיקת הגבלת בקשות
5. ✅ **Security headers** - בדיקת headers אבטחה

**הערות חשובות:**
- ✅ DatabaseInit שרץ על startup - צריך לספק test database או לספק mock
- ✅ Redis הוא optional (יכול להיות null) - צריך לטפל בזה בבדיקות
- ✅ כל בדיקה עם database נקי - isolation מלא

**דוגמה - auth.controller.spec.ts:**
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PG_POOL } from '../database/database.module';
import { Pool } from 'pg';

describe('AuthController', () => {
  let app: INestApplication;
  let db: Pool;

  beforeAll(async () => {
    // יצירת test module עם כל ה-dependencies
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL) // Mock database לבדיקות
      .useValue(/* test database pool */)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    db = moduleFixture.get<Pool>(PG_POOL);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
    });

    it('should reject invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
        })
        .expect(400);
    });
  });
});
```

**הערות חשובות:**
- ✅ משתמש ב-`@nestjs/testing` שכבר קיים ב-devDependencies
- ✅ צריך לטפל ב-DatabaseInit שרץ על startup:
  - אפשרות 1: לספק test database (מומלץ)
  - אפשרות 2: לספק mock של DatabaseInit
- ✅ Redis הוא optional (יכול להיות null) - צריך לטפל בזה:
  ```typescript
  // Mock Redis לבדיקות
  .overrideProvider(REDIS)
  .useValue(null) // או mock Redis client
  ```
- ✅ צריך test database נפרד - לא להשתמש ב-production או dev
- ✅ כל בדיקה עם database נקי - isolation מלא

---

## 📱 שלב 2: הגדרת בדיקות לפרונט

### 2.1 התקנת Dependencies

```bash
cd MVP
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo
```

### 2.2 קבצי תצורה

**jest.config.js:**
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    // תמיכה ב-Expo 53, React 19, React Native 0.79.5
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/scripts/**', // scripts לא נכללים ב-coverage
    '!**/audit-reports/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // תמיכה ב-tsconfig.json הקיים
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
};
```

**jest.setup.js:**
```javascript
// Mock Expo modules שלא זמינים בסביבת בדיקות
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {},
    executionEnvironment: 'standalone',
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

**הערות חשובות:**
- ✅ תמיכה ב-Expo 53 (גרסה נוכחית)
- ✅ תמיכה ב-React 19
- ✅ תמיכה ב-React Native 0.79.5
- ✅ Mocking של Expo modules שלא זמינים בסביבת בדיקות
- ✅ לא נשבור את `app.config.js` או קבצי config אחרים

### 2.3 עדכון package.json

הוספת scripts (ללא שינוי בסקריפטים הקיימים):
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**הערות:**
- ✅ הסקריפטים הקיימים (start, build, audit:* וכו') לא ישתנו
- ✅ הסקריפטים החדשים מתווספים בלבד
- ✅ לא נשנה את `app.config.js` או קבצי config אחרים

### 2.4 מבנה תיקיות

```
MVP/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx          ← בדיקות components
├── utils/
│   ├── auth.ts
│   └── __tests__/
│       └── auth.test.ts             ← בדיקות utils
└── jest.config.js
```

### 2.5 בדיקות ראשוניות לפרונט

**עדיפות גבוהה:**
1. ✅ **Auth utilities** - בדיקת פונקציות authentication
2. ✅ **API client** - בדיקת קריאות API
3. ✅ **Components** - בדיקת רכיבי UI בסיסיים
4. ✅ **Navigation** - בדיקת ניווט
5. ✅ **State management** - בדיקת Zustand stores

---

## 🚀 שלב 3: CI/CD עם הגנה על Production

### 3.1 GitHub Actions Workflow

**`.github/workflows/test-and-deploy.yml`:**

```yaml
name: Test and Deploy

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main, dev]
  workflow_dispatch: # אפשרות להרצה ידנית

jobs:
  test-server:
    name: Test Server
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: KC-MVP-server/package-lock.json
      - name: Install dependencies
        working-directory: ./KC-MVP-server
        run: npm ci
      - name: Run tests
        working-directory: ./KC-MVP-server
        run: npm run test:ci
        env:
          # Test environment variables (לא production!)
          NODE_ENV: test
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      - name: Check coverage
        working-directory: ./KC-MVP-server
        run: npm run test:cov
        continue-on-error: true # לא נכשל אם coverage נמוך

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: MVP/package-lock.json
      - name: Install dependencies
        working-directory: ./MVP
        run: npm ci
      - name: Run tests
        working-directory: ./MVP
        run: npm run test:ci
        continue-on-error: true # לא נכשל אם אין בדיקות עדיין

  protect-production:
    name: Protect Production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.base_ref == 'main'
    needs: [test-server, test-frontend]
    steps:
      - uses: actions/checkout@v4
      - name: Verify environment separation
        run: |
          echo "🔴 PRODUCTION BRANCH - Extra checks required"
          # הרצת הסקריפט הקיים
          cd KC-MVP-server
          npm ci
          npm run check:env || exit 1
          echo "✅ Environment separation verified"
```

**הערות חשובות:**
- ✅ לא נשנה את `check-env-separation.yml` הקיים - נוסיף workflow חדש
- ✅ הבדיקות רצות עם test environment - לא production!
- ✅ אם אין בדיקות עדיין, זה לא יכשיל את ה-workflow (continue-on-error)
- ✅ ב-production branch - חובה שהכל יעבור

### 3.2 Branch Protection Rules

**הגדרות ב-GitHub:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date
- ✅ Require pull request reviews
- ✅ Block force pushes to main
- ✅ Block deletions of main

### 3.3 בדיקות לפני Deploy

**Pre-deploy checks:**
1. ✅ כל הבדיקות עוברות
2. ✅ Coverage מינימלי (80%+)
3. ✅ אין hardcoded credentials
4. ✅ Environment variables תקינים
5. ✅ Database schema תואם

---

## 📋 שלב 4: תוכנית יישום

### שבוע 1: תשתית בסיסית

**יום 1-2:**
- [ ] התקנת dependencies לשרת (jest, ts-jest, supertest)
- [ ] יצירת jest.config.js לשרת (תמיכה ב-tsconfig-paths)
- [ ] יצירת test database setup (נפרד מ-dev ו-production!)
- [ ] יצירת בדיקות ראשוניות ל-AuthController (mock database)
- [ ] וידוא שהבדיקות רצות ולא שוברות את הקוד הקיים

**יום 3-4:**
- [ ] התקנת dependencies לפרונט (jest, jest-expo, @testing-library/react-native)
- [ ] יצירת jest.config.js לפרונט (תמיכה ב-Expo 53, React 19)
- [ ] יצירת jest.setup.js עם mocks ל-Expo modules
- [ ] יצירת בדיקות ראשוניות ל-auth utils
- [ ] בדיקות components בסיסיים (Button, Input וכו')
- [ ] וידוא שהבדיקות רצות ולא שוברות את הקוד הקיים

**יום 5:**
- [ ] יצירת `.github/workflows/test-and-deploy.yml` (לא נשנה את הקיים!)
- [ ] בדיקות שהבדיקות רצות ב-CI
- [ ] תיעוד בסיסי - איך להריץ בדיקות
- [ ] וידוא שהכל עובד ולא שובר דברים קיימים

### שבוע 2: הרחבת בדיקות

**יום 1-2:**
- [ ] בדיקות לכל ה-controllers החשובים
- [ ] בדיקות database operations
- [ ] בדיקות Redis caching

**יום 3-4:**
- [ ] בדיקות E2E לזרימות מרכזיות
- [ ] בדיקות integration
- [ ] שיפור coverage

**יום 5:**
- [ ] תיעוד
- [ ] הדרכה לצוות

---

## 🎯 יעדי Coverage

### שרת
- **Unit Tests:** 80%+ coverage
- **Integration Tests:** כל ה-endpoints החשובים
- **E2E Tests:** זרימות מרכזיות (auth, donations, chat)

### פרונט
- **Unit Tests:** 70%+ coverage
- **Component Tests:** כל ה-components הציבוריים
- **Utils Tests:** 90%+ coverage

---

## 🔒 הגנה על Production

### כללי ברזל

1. **אין deploy ל-main ללא:**
   - ✅ כל הבדיקות עוברות
   - ✅ Code review
   - ✅ Environment validation
   - ✅ Database migration tests

2. **בדיקות חובה לפני merge:**
   - ✅ Unit tests
   - ✅ Integration tests
   - ✅ Environment separation check
   - ✅ Security scan

3. **אוטומציה:**
   - ✅ GitHub Actions חוסם merge אם בדיקות נכשלות
   - ✅ Railway לא יכול לעשות deploy אם CI נכשל
   - ✅ Alerts על כשלונות

---

## 📊 מדדים והצלחה

### KPIs

1. **Coverage:**
   - שרת: 80%+ (יעד ראשוני: 60%)
   - פרונט: 70%+ (יעד ראשוני: 50%)

2. **מהירות:**
   - בדיקות רצות תוך 5 דקות
   - Feedback תוך 10 דקות

3. **אמינות:**
   - 0 bugs ב-production שנגרמו מקוד לא נבדק
   - 100% מהשינויים עוברים בדיקות

---

## 🚨 סיכונים ופתרונות

### סיכון 1: בדיקות איטיות
**פתרון:** 
- Parallel execution ב-Jest
- Test database נפרד (לא production או dev!)
- Mocking של Redis (כי הוא optional)
- Mocking של DatabaseInit (לא צריך לרוץ בכל בדיקה)

### סיכון 2: False positives
**פתרון:** 
- בדיקות יציבות
- Retry logic לבדיקות flaky
- Flaky test detection
- Isolation בין בדיקות (כל בדיקה עם database נקי)

### סיכון 3: Maintenance overhead
**פתרון:** 
- בדיקות פשוטות וקריאות
- תיעוד טוב
- Code review של בדיקות
- התחלה בקטן - לא לכתוב בדיקות לכל דבר מיד

### סיכון 4: שבירת קוד קיים
**פתרון:**
- ✅ לא נשנה קבצי config קיימים (package.json, tsconfig וכו')
- ✅ לא נשנה scripts קיימים
- ✅ לא נשנה workflows קיימים
- ✅ רק נוסיף קבצים חדשים
- ✅ בדיקות לא יכנסו ל-build (tsconfig.build.json כבר מוציא אותן)

---

## 📚 משאבים

### תיעוד
- [ ] מדריך הרצת בדיקות
- [ ] מדריך כתיבת בדיקות
- [ ] Troubleshooting guide

### כלים
- Jest - Testing framework
- Supertest - API testing
- React Native Testing Library - Component testing
- GitHub Actions - CI/CD

---

## ✅ Checklist יישום

### תשתית
- [ ] Jest מוגדר לשרת
- [ ] Jest מוגדר לפרונט
- [ ] Test database מוגדר
- [ ] CI/CD workflows מוגדרים

### בדיקות
- [ ] AuthController tests
- [ ] Database tests
- [ ] API integration tests
- [ ] Frontend component tests
- [ ] Utils tests

### הגנה
- [ ] Branch protection rules
- [ ] Pre-deploy checks
- [ ] Environment validation
- [ ] Security scans

### תיעוד
- [ ] Testing guide
- [ ] Contribution guidelines
- [ ] Troubleshooting

---

---

## ⚠️ הבטחות - לא נשבור דברים קיימים

### מה לא נשנה:
- ❌ לא נשנה `package.json` scripts קיימים
- ❌ לא נשנה `tsconfig.json` או `tsconfig.build.json`
- ❌ לא נשנה `app.config.js` (פרונט)
- ❌ לא נשנה `nest-cli.json` (שרת)
- ❌ לא נשנה workflows קיימים (רק נוסיף חדש)
- ❌ לא נשנה database schema או migrations
- ❌ לא נשנה Redis configuration
- ❌ לא נשנה environment variables

### מה נוסיף:
- ✅ קבצי בדיקות חדשים (`*.spec.ts`, `*.test.tsx`)
- ✅ `jest.config.js` (שרת ופרונט)
- ✅ `jest.setup.js` (פרונט)
- ✅ scripts חדשים ב-`package.json` (test, test:watch וכו')
- ✅ workflow חדש ב-GitHub Actions
- ✅ תיקיית `test/` לבדיקות E2E (שרת)

### הגנה על Build:
- ✅ `tsconfig.build.json` כבר מוציא `**/*.spec.ts` - הבדיקות לא יכנסו ל-build
- ✅ הבדיקות רצות רק ב-`npm test` - לא ב-`npm build` או `npm start`
- ✅ Test database נפרד - לא נגע ב-production או dev databases

---

**הערות:**
- תוכנית זו היא מסגרת עבודה - ניתן להתאים לפי צרכים
- מומלץ להתחיל בקטן ולהרחיב בהדרגה
- חשוב לשמור על בדיקות מהירות ואמינות
- **הכל מתווסף בלבד - לא משנה דברים קיימים!**

