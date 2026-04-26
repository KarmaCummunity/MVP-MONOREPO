# Troubleshooting Guide - KC-MVP-Server

## 🔧 Common problems and solutions

---

### 1. TypeScript errors: "Property has no initializer"

**Symptoms:**
```
error TS2564: Property 'propertyName' has no initializer and is not definitely assigned in the constructor.
```

**Solution:**
Instead of using `!` (Definite Assignment Assertion), use explicit initialization:

❌ **Incorrect:**
```typescript
class MyDto {
  @IsString()
  name!: string;
}
```

✅ **Correct:**
```typescript
class MyDto {
  @IsString()
  name: string = '';
}
```

**Additional cases:**
- `number` → `= 0`
- `boolean` → `= false`
- `array` → `= []`
- `object` → `= {}`

**Note:** Optional properties with `?` do not require initialization:
```typescript
@IsOptional()
@IsString()
name?: string;  // ✅ OK like that
```

---

### 2. Build errors in Railway/Docker

**Symptoms:**
- Build failed at `npm run build` step
- TypeScript errors not appearing locally

**Solution:**

1. **Clean old build files:**
```bash
rm -rf dist
rm -f *.tsbuildinfo
```

2. **Check local compilation:**
```bash
npx tsc --noEmit
```

3. **check full build:**
```bash
npm run build
```

4. **If everything works locally but not on the Railway:**
   - Make sure `node_modules` is not in `.gitignore`
   - Check that the `package-lock.json` is up to date
   - Make sure `tsconfig.json` is correct

---

### 3. Problems with Redis Connection

**Symptoms:**
```
Error: Redis connection failed
ECONNREFUSED
```

**Solution:**

1. **Make sure Redis is running:**
```bash
# local:
redis-cli ping
# should return: PONG

# Docker:
docker ps | grep redis
```

2. **Check the environment variables:**
```bash
echo $REDIS_URL
# Should be: redis://localhost:6379 or full URL
```

3. **Start local Redis:**
```bash
# macOS:
brew services start redis

# Docker:
docker compose up -d redis
```

---

### 4. Problems with PostgreSQL Connection

**Symptoms:**
```
Error: Connection terminated unexpectedly
ECONNREFUSED ::1:5432
```

**Solution:**

1. **Make sure Postgres is running:**
```bash
# Test:
psql -U kc -d kc_db -h localhost

# Run (Docker):
docker compose up -d postgres
```

2. **Check environment variables:**
```bash
echo $DATABASE_URL
# or:
echo $POSTGRES_HOST
echo $POSTGRES_USER
echo $POSTGRES_DB
```

3. **Initialize the database:**
```bash
npm run init:db
```

---

### 5. Authentication / Google OAuth errors

**Symptoms:**
- "Invalid token"
- "User not found"
- Problems with Google login

**Solution:**

1. **Make sure environment variables are set:**
```bash
echo $EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
echo $GOOGLE_CLIENT_ID
```

2. **Check that the tokens are valid:**
   - Sign in to the Google Cloud Console
   - Make sure OAuth 2.0 Client ID is active
   - Check Authorized redirect URIs

3. **Clear Redis cache:**
```bash
redis-cli FLUSHALL
```

---

### 6. Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

1. **Find the process:**
```bash
lsof -i :3000
```

2. **Stop the process:**
```bash
kill -9 <PID>
```

3. **Or change the port:**
```bash
PORT=3001 npm run start
```

---

### 7. Problems with Migrations / Schema

**Symptoms:**
- Tables do not exist
- Missing fields
- Schema outdated

**Solution:**

1. **Reset the database (⚠️ delete data!):**
```bash
npm run reset:db:full
```

2. **only new schema (saves data):**
```bash
npm run init:db
```

3. **Check that the schema is up-to-date:**
```bash
psql -U kc -d kc_db -h localhost
\dt # List of tables
\d challenges # Structure of a specific table
```

---

### 8. Validation errors

**Symptoms:**
```
BadRequestException: Validation failed
```

**Solution:**

1. **check the logs:**
   - The server prints the exact validation errors

2. **Make sure the data matches the DTO:**
```typescript
// Example:
class CreateChallengeDto {
  @IsString()
  @Length(1, 50)
  name: string = '';  // Must be a string between 1-50 characters
  
  @IsNumber()
  @Min(1)
  customResetAmount: number = 0;  // must be number >= 1
}
```

3. **Use Postman/Thunder Client:**
   - Check the request body
   - Make sure Content-Type is `application/json`

---

### 9. CORS errors

**Symptoms:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution:**

1. **Make sure CORS is set in `main.ts`:**
```typescript
app.enableCors({
  origin: ['http://localhost:8081', 'https://your-domain.com'],
  credentials: true,
});
```

2. **Add the client's origin:**
   - Update the list of authorized origins

---:**
```bash
# Should be defined at least:
DATABASE_URL=...
REDIS_URL=...
```

---

## 🚀 Quick tests before Deploy

### Checklist:

- [ ] `npm run build` works without errors
- [ ] `npx tsc --noEmit` passes without errors
- [ ] `npm test` passes (if there are tests)
- [ ] Environment variables set in Railway/Docker
- [ ] `.env` is not uploaded to the git (only `.env.example`)
- [ ] `package-lock.json` updated and in git
- [ ] Updated version in `package.json`
- [ ] `CHANGELOG.md` has been updated

---

## 📞 More help

If the problem persists:

1. **check the full logs**
2. **Search for similar issues on GitHub Issues**
3. **Share the relevant logs and code**
4. **Try a clean build:**
   ```bash
   rm -rf node_modules dist *.tsbuildinfo
   npm ci
   npm run build
   ```

---

**Last updated:** November 23, 2025  
**Version:** 1.7.6