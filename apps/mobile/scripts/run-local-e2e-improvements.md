# שיפורים מומלצים לסקריפט run-local-e2e.sh

## מה הסקריפט עושה טוב ✅

1. ✅ בודק גרסת Node.js
2. ✅ בודק קיומם של קבצים נדרשים
3. ✅ בודק זמינות Docker
4. ✅ מנהל פורטים (משחרר פורטים תפוסים)
5. ✅ מרים Docker services (Postgres + Redis)
6. ✅ ממתין שהשירותים יהיו מוכנים
7. ✅ מריץ migrations
8. ✅ בונה את השרת
9. ✅ מאתחל את ה-DB
10. ✅ בודק שהשרת עובד (health checks)
11. ✅ מריץ בדיקות API מקיפות
12. ✅ מתחיל את Expo

## מה חסר או צריך שיפור ⚠️

### 1. בדיקת Docker Containers קיימים
**בעיה**: הסקריפט לא בודק אם יש containers קיימים שרצים על אותם פורטים לפני שהוא מנסה להרים חדשים.

**פתרון מוצע**:
```bash
# לפני docker compose up, לבדוק אם יש containers קיימים
EXISTING_POSTGRES=$(docker ps -q -f name=postgres)
EXISTING_REDIS=$(docker ps -q -f name=redis)

if [[ -n "$EXISTING_POSTGRES" ]] || [[ -n "$EXISTING_REDIS" ]]; then
  log_warning "Found existing containers. Stopping them..."
  (cd "$SERVER_DIR" && docker compose down)
fi
```

### 2. בדיקת Expo CLI
**בעיה**: הסקריפט לא בודק אם Expo CLI מותקן לפני שהוא מנסה להריץ `npx expo start`.

**פתרון מוצע**:
```bash
# לפני שמתחילים את Expo
if ! command -v expo >/dev/null 2>&1 && ! npx expo --version >/dev/null 2>&1; then
  log_warning "Expo CLI not found. Installing..."
  npm install -g expo-cli || log_warning "Failed to install Expo CLI globally, will use npx"
fi
```

### 3. בדיקת TypeScript לפני Build
**בעיה**: הסקריפט לא בודק אם יש שגיאות TypeScript לפני שהוא מנסה לבנות.

**פתרון מוצע**:
```bash
# לפני npm run build
log_info "Checking TypeScript compilation..."
if ! npx tsc --noEmit -p tsconfig.json 2>/dev/null; then
  log_warning "TypeScript errors found, but continuing with build..."
fi
```

### 4. בדיקת npm Cache
**בעיה**: לפעמים npm cache יכול לגרום לבעיות. הסקריפט לא מנקה אותו.

**פתרון מוצע** (אופציונלי):
```bash
# אם יש בעיות עם dependencies
if [[ "${CLEAR_NPM_CACHE:-}" == "1" ]]; then
  log_info "Clearing npm cache..."
  npm cache clean --force
fi
```

### 5. בדיקת Database Schema לפני Init
**בעיה**: הסקריפט לא בודק אם ה-DB כבר מאותחל לפני שהוא מנסה לאתחל אותו מחדש.

**פתרון מוצע**:
```bash
# לפני init-db, לבדוק אם הטבלאות כבר קיימות
TABLES_COUNT=$(docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")

if [[ "$TABLES_COUNT" -gt "0" ]]; then
  log_info "Database already initialized ($TABLES_COUNT tables found)"
  if [[ "${RESET_DB:-}" == "1" ]]; then
    log_warning "RESET_DB=1 set, will reinitialize database..."
  else
    log_info "Skipping database initialization (set RESET_DB=1 to force reinit)"
    SKIP_DB_INIT=1
  fi
fi
```

### 6. בדיקת Expo Server אחרי Start
**בעיה**: הסקריפט לא בודק אם Expo server עובד אחרי שהוא מתחיל אותו.

**פתרון מוצע**:
```bash
# אחרי שמתחילים את Expo, לבדוק שהוא עובד
log_info "Waiting for Expo server to be ready..."
EXPO_READY=0
for i in {1..30}; do
  if curl -sf "http://localhost:$EXPO_PORT" >/dev/null 2>&1; then
    EXPO_READY=1
    break
  fi
  sleep 1
done

if [[ $EXPO_READY -eq 1 ]]; then
  log_success "Expo server is ready"
else
  log_warning "Expo server might not be ready yet, but continuing..."
fi
```

### 7. בדיקת .env Files
**בעיה**: הסקריפט לא בודק אם יש .env files שצריך לטעון.

**פתרון מוצע**:
```bash
# לבדוק אם יש .env files
if [[ -f "$SERVER_DIR/.env" ]]; then
  log_info "Found .env file in server directory"
  # אפשר לטעון אותו עם source או dotenv
fi

if [[ -f "$CLIENT_DIR/.env" ]]; then
  log_info "Found .env file in client directory"
fi
```

### 8. בדיקת Git Status (אופציונלי)
**בעיה**: לפעמים כדאי לדעת אם יש שינויים לא commit-ים לפני שמריצים E2E.

**פתרון מוצע** (אופציונלי):
```bash
# רק אם CHECK_GIT_STATUS=1
if [[ "${CHECK_GIT_STATUS:-}" == "1" ]]; then
  if [[ -d "$SERVER_DIR/.git" ]]; then
    if [[ -n "$(cd "$SERVER_DIR" && git status --porcelain)" ]]; then
      log_warning "Server has uncommitted changes"
    fi
  fi
fi
```

### 9. בדיקת Port 5432 ו-6379 לפני Docker
**בעיה**: הסקריפט לא בודק אם הפורטים 5432 ו-6379 תפוסים לפני שהוא מנסה להרים Docker.

**פתרון מוצע**:
```bash
# לפני docker compose up
if ! is_port_available 5432; then
  log_error "Port 5432 (PostgreSQL) is already in use. Please free it or stop the existing service."
  exit 1
fi

if ! is_port_available 6379; then
  log_error "Port 6379 (Redis) is already in use. Please free it or stop the existing service."
  exit 1
fi
```

### 10. טיפול טוב יותר ב-Errors של Expo
**בעיה**: אם Expo נכשל להתחיל, הסקריפט לא מטפל בזה טוב.

**פתרון מוצע**:
```bash
# במקום רק npx expo start, לבדוק את ה-exit code
if ! EXPO_DEV_SERVER_PORT="$EXPO_PORT" npx expo start --port "$EXPO_PORT" --web --clear; then
  log_error "Expo failed to start"
  exit 1
fi
```

### 11. בדיקת Dependencies לפני Build
**בעיה**: הסקריפט בודק body-parser, אבל לא בודק dependencies אחרים.

**פתרון מוצע**:
```bash
# לבדוק dependencies קריטיים
CRITICAL_DEPS=("@nestjs/core" "@nestjs/common" "pg" "ioredis")
for dep in "${CRITICAL_DEPS[@]}"; do
  if [[ ! -d "node_modules/$dep" ]]; then
    log_warning "Critical dependency $dep not found. Installing..."
    npm install "$dep"
  fi
done
```

### 12. בדיקת Database Connection לפני Init
**בעיה**: הסקריפט לא בודק אם הוא יכול להתחבר ל-DB לפני שהוא מנסה לאתחל אותו.

**פתרון מוצע**:
```bash
# לפני init-db
log_info "Testing database connection..."
if ! docker exec "$POSTGRES_CONTAINER" psql -U kc -d kc_db -c "SELECT 1;" >/dev/null 2>&1; then
  log_error "Cannot connect to database"
  exit 1
fi
```

## סיכום

הסקריפט **נראה טוב מאוד** ומטפל ברוב הדברים החשובים. השיפורים המוצעים הם בעיקר:
- בדיקות נוספות לפני פעולות
- טיפול טוב יותר ב-errors
- אופציות נוספות (כמו RESET_DB, CLEAR_NPM_CACHE)
- בדיקות של services אחרי שהם מתחילים

הסקריפט הנוכחי **אמור לעבוד טוב** לרוב המקרים, אבל השיפורים האלה יכולים להפוך אותו ליותר robust.




