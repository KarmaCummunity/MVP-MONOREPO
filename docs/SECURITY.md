# Security Guidelines

## Environment Variables and Secrets Management

### ❌ NEVER Do This

**DO NOT hardcode passwords, API keys, or secrets in code:**

```typescript
// ❌ BAD - Hardcoded password
const dbUrl = 'postgresql://user:hardcoded_password@localhost:5432/db';

// ❌ BAD - Hardcoded API key
const apiKey = 'sk_live_1234567890abcdef';

// ❌ BAD - Checking password prefixes
if (passwordPrefix === "mmWLXgvXF") { /* ... */ }
```

### ✅ Always Do This

**Use environment variables for ALL sensitive data:**

```typescript
// ✅ GOOD - From environment
const dbUrl = process.env.DATABASE_URL;

// ✅ GOOD - With validation
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// ✅ GOOD - Check host/database name, NOT password
if (dbInfo.host.includes('localhost')) {
  console.log('Development environment');
}
```

## Files That Must Never Be Committed

Add these to `.gitignore`:

```
# Environment files with secrets
.env
.env.local
.env.development
.env.production
.env.test

# Backup files that might contain secrets
*.backup
*.bak
.env.*
!.env.example
!.env.*.example
```

## Safe Files to Commit

These are safe because they contain NO real credentials:

- `.env.example` - Template with placeholder values
- `.env.test.example` - Template for test configuration
- Documentation files (README, SECURITY, etc.)

## Setting Up Secrets

### Local Development

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secure secrets:**
   ```bash
   # Generate JWT secret (32+ characters)
   openssl rand -base64 32
   
   # Generate other secrets as needed
   openssl rand -hex 32
   ```

3. **Fill in real values in `.env`:**
   ```bash
   DATABASE_URL=postgresql://user:YOUR_SECURE_PASSWORD@localhost:5432/kc_db
   JWT_SECRET=<output from openssl rand -base64 32>
   GOOGLE_CLIENT_ID=<from Google Cloud Console>
   ```

### Production/Staging

**Use environment variables in your deployment platform:**

- Railway: Project → Variables
- Vercel: Project Settings → Environment Variables
- AWS/GCP/Azure: Use their secrets managers
- Docker: Use secrets or env files (not in git)

**NEVER:**
- Commit production credentials to git
- Share credentials in Slack/email
- Use the same credentials for dev and prod
- Hardcode credentials in CI/CD configs

## Testing Credentials

For testing, use one of these approaches:

### Option 1: Environment Variables (Recommended)

```typescript
// jest.setup.js
if (!process.env.TEST_DATABASE_URL) {
  console.warn('⚠️  TEST_DATABASE_URL not set');
  process.env.DATABASE_URL = 'postgresql://localhost/test_db';
}
```

### Option 2: Test-Specific Config

```typescript
// .env.test (gitignored)
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/test_db
```

### Option 3: CI/CD Environment

Set test credentials in your CI/CD environment:
- GitHub Actions: Repository → Settings → Secrets
- GitLab CI: Settings → CI/CD → Variables
- CircleCI: Project Settings → Environment Variables

## Environment Separation

### Verify Environment Connection

Use host and database name patterns, NOT passwords:

```typescript
// ✅ GOOD - Check host pattern
function isProduction(dbUrl: string): boolean {
  const url = new URL(dbUrl);
  return url.hostname.includes('railway.app') ||
         url.hostname.includes('production');
}

// ❌ BAD - Check password
function isProduction(dbUrl: string): boolean {
  return dbUrl.includes('RHkhivARk'); // NEVER DO THIS
}
```

### Environment Indicators

**Development:**
- Host: `localhost`, `127.0.0.1`, or `*.dev.*`
- Database name: contains `dev`, `test`, `local`

**Production:**
- Host: `*.railway.app`, `*.amazonaws.com`, etc.
- Database name: `prod`, `production`, or specific name

## Incident Response

### If Credentials Are Leaked

1. **Immediately rotate all affected credentials**
2. **Check git history** - credentials may be in old commits
3. **Use git-filter-repo or BFG** to remove from history
4. **Notify your team** and security contact
5. **Review access logs** for unauthorized access
6. **Update documentation** with lessons learned

### Tools to Prevent Leaks

- **Pre-commit hooks**: `git-secrets`, `detect-secrets`
- **CI/CD scanners**: Snyk, GitGuardian, GitHub Secret Scanning
- **Code review**: Always review changes before merging

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [Railway Docs - Environment Variables](https://docs.railway.app/develop/variables)

## Questions?

If you're unsure whether something should be in code or environment variables, ask:

1. **Would this be different in dev vs prod?** → Environment variable
2. **Would this be a problem if leaked publicly?** → Environment variable
3. **Is this a password, key, or token?** → Environment variable
4. **Can I safely show this in a screenshot?** → If no, environment variable

**When in doubt, use an environment variable!**
