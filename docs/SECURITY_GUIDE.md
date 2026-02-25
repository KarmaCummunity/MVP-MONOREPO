# Security Guide

Comprehensive security guidelines for the KC project.

## Environment Variables and Secrets

### ❌ Never Do This

**DO NOT hardcode sensitive data:**

```typescript
// ❌ BAD - Hardcoded password
const dbUrl = 'postgresql://user:hardcoded_password@localhost:5432/db';

// ❌ BAD - Hardcoded API key
const apiKey = 'sk_live_1234567890abcdef';

// ❌ BAD - Checking password values
if (password === "mmWLXgvXF") { /* ... */ }
```

### ✅ Always Do This

**Use environment variables:**

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

## Files to Never Commit

Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.development
.env.production
.env.test

# Backup files that might contain secrets
*.backup
*.bak
data-backups/

# Report files
*-report.json
*-issues.json
snyk-*.json
sonar-*.json

# Allow templates only
!.env.example
!.env.*.example
```

## Safe Files to Commit

These are safe (contain NO real credentials):
- `.env.example` - Template with placeholders
- `.env.test.example` - Test configuration template
- Documentation files (README, SECURITY, etc.)

## Setting Up Secrets

### Local Development

1. **Copy example file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secure secrets:**
   ```bash
   # JWT secret (32+ characters)
   openssl rand -base64 32
   
   # Database password
   openssl rand -base64 16
   
   # General secrets
   openssl rand -hex 32
   ```

3. **Fill in `.env`:**
   ```bash
   DATABASE_URL=postgresql://user:YOUR_SECURE_PASSWORD@localhost:5432/kc_db
   JWT_SECRET=<output from openssl rand -base64 32>
   GOOGLE_CLIENT_ID=<from Google Cloud Console>
   ```

### Production/Staging

**Use platform environment variables:**

- **Railway**: Project → Variables
- **Vercel**: Project Settings → Environment Variables
- **AWS/GCP/Azure**: Use their secrets managers
- **Docker**: Use secrets or env files (not in git)

## Password Requirements

### Database Passwords

- **Minimum 16 characters**
- Generated randomly
- Different for each environment
- Never use default passwords like `password`, `admin`, etc.

### JWT Secrets

- **Minimum 32 characters**
- Cryptographically random
- Different for each environment
- Rotate periodically (every 90 days)

### API Keys

- Use environment-specific keys
- Rotate if exposed
- Restrict permissions to minimum needed
- Monitor usage for anomalies

## Logging Security

### ❌ Never Log

```typescript
// ❌ BAD - Full email visible
logger.log(`User logged in: ${user.email}`);

// ❌ BAD - Password in logs
logger.error(`Login failed for ${email} with password ${password}`);

// ❌ BAD - Tokens in logs
logger.debug(`JWT token: ${token}`);
```

### ✅ Always Log Safely

```typescript
// ✅ GOOD - Masked email
logger.log(`User logged in: ${maskEmail(user.email)}`);

// ✅ GOOD - Generic message
logger.error(`Login failed for user`);

// ✅ GOOD - No sensitive data
logger.debug(`Authentication successful`);
```

## Authentication Security

### Rate Limiting

```typescript
// Login endpoints: 5 attempts per minute
@ThrottlerGuard({ limit: 5, ttl: 60 })

// API endpoints: 60 requests per minute
@ThrottlerGuard({ limit: 60, ttl: 60 })
```

### Session Management

- Use secure, httpOnly cookies
- Implement session timeout (30 minutes)
- Clear sessions on logout
- Invalidate sessions on password change

### Password Policies

- Minimum 8 characters
- Require mix of letters, numbers, symbols
- Check against common password lists
- Implement password history (last 5)

## Data Protection

### Database Security

1. **Connection Security:**
   - Use SSL/TLS for connections
   - Whitelist IP addresses
   - Use strong authentication
   - Enable query logging (without sensitive data)

2. **Access Control:**
   - Principle of least privilege
   - Separate read/write users
   - Regular access audits
   - Rotate credentials quarterly

3. **Encryption:**
   - Encrypt sensitive columns (PII, payment data)
   - Use database-level encryption at rest
   - Encrypt backups

### Redis Security

1. **Connection:**
   - Require password authentication
   - Use TLS for connections
   - Bind to specific interfaces

2. **Data:**
   - Don't store sensitive data in Redis
   - Set appropriate TTLs
   - Clear caches on security events

## API Security

### Headers

```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true,
}));
```

### CORS

```typescript
// Strict CORS configuration
app.enableCors({
  origin: [
    'https://karma-community-kc.com',
    'https://www.karma-community-kc.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Input Validation

```typescript
// ✅ GOOD - Validate all inputs
@IsEmail()
email: string;

@IsString()
@MinLength(8)
@MaxLength(100)
password: string;

@IsOptional()
@IsUrl()
website?: string;
```

## Firebase Security

### Service Account

1. **Storage:**
   - Never commit service account JSON
   - Use environment variable: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Rotate keys annually

2. **Permissions:**
   - Grant minimum required permissions
   - Use separate accounts for dev/prod
   - Monitor usage logs

### Authentication

1. **Token Validation:**
   - Verify all Firebase tokens
   - Check expiration
   - Validate issuer
   - Check audience

2. **User Management:**
   - Implement email verification
   - Enable multi-factor authentication
   - Monitor failed login attempts

## Deployment Security

### Pre-Deployment Checklist

- [ ] No secrets in code or config files
- [ ] All environment variables set in deployment platform
- [ ] Different secrets for each environment
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] SSL/TLS certificates valid
- [ ] Database backups configured
- [ ] Monitoring and alerting set up

### Post-Deployment Verification

```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block

# Test rate limiting
for i in {1..100}; do curl https://your-domain.com/api/health; done

# Should see 429 Too Many Requests after limit
```

## Incident Response

### If Credentials Are Exposed

1. **Immediate Actions:**
   - Rotate affected credentials immediately
   - Invalidate all active sessions
   - Review access logs for unauthorized access
   - Notify affected users if needed

2. **Investigation:**
   - Determine scope of exposure
   - Check for unauthorized access
   - Review recent changes
   - Document timeline

3. **Remediation:**
   - Update all instances with new credentials
   - Review and improve security practices
   - Update documentation
   - Conduct post-mortem

### Security Monitoring

1. **What to Monitor:**
   - Failed login attempts
   - Rate limit violations
   - Database connection errors
   - Unusual API usage patterns
   - Error spikes

2. **Alerting:**
   - Set up alerts for critical events
   - Monitor error rates
   - Track response times
   - Review logs daily

## Regular Security Tasks

### Daily
- Monitor error logs
- Check failed authentication attempts
- Review unusual activity

### Weekly
- Review access logs
- Check for security updates
- Verify backups are working

### Monthly
- Update dependencies
- Review user permissions
- Check for exposed secrets (git-secrets, truffleHog)
- Test disaster recovery

### Quarterly
- Rotate database credentials
- Update JWT secrets
- Security audit
- Penetration testing
- Review and update policies

## Tools and Resources

### Recommended Tools

- **Secrets Scanning**: git-secrets, truffleHog
- **Dependency Scanning**: Snyk, npm audit
- **Code Analysis**: SonarQube, ESLint security plugins
- **Penetration Testing**: OWASP ZAP, Burp Suite

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Railway Security](https://docs.railway.app/reference/security)

## Questions?

If you have security concerns or questions:
1. Don't commit potentially sensitive code
2. Contact the security team
3. Document the issue
4. Follow responsible disclosure

---

**Remember:** Security is everyone's responsibility. When in doubt, ask before committing.
