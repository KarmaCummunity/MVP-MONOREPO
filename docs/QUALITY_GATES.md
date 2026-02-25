# Quality Gates - Automated Code Quality Checks

## Overview

This monorepo has automated quality gates that run at multiple stages to ensure code quality and prevent issues from reaching production.

## When Quality Checks Run

### 1. Pre-Push Hook (Local) 🚀

**Trigger**: Automatically runs before every `git push`

**What it checks**:
- Detects which workspace changed (api/mobile)
- For API changes:
  - ✅ ESLint on changed files only
  - ✅ TypeScript compilation
  - ✅ All tests with coverage
  - ✅ Security vulnerabilities (Snyk, if configured)
  - ✅ Sensitive data detection

**How to run manually**:
```bash
cd apps/api
npm run quality:gate
```

**Skip if needed** (not recommended):
```bash
git push --no-verify
```

---

### 2. GitHub Actions - PR Quality Check 🔍

**Trigger**: Runs on Pull Requests to `main` or `dev`

**What it checks**:
- Changed files detection (only runs on relevant changes)
- ESLint on changed files
- Full test suite with coverage
- SonarCloud code quality scan
- Snyk security scan
- Adds comment to PR with results

**Path filters**: Only runs when files in `apps/api/**` or workflow files change

---

### 3. GitHub Actions - Quality Gate (Push to main/dev) 🛡️

**Trigger**: Runs on direct pushes to `main` or `dev` branches

**What it checks**:
- Same as PR Quality Check
- Blocks merge if quality gate fails
- Reports to SonarCloud dashboard

**Path filters**: Only runs when files in `apps/api/**` or workflow files change

---

### 4. SonarCloud Continuous Analysis 📊

**Trigger**: Runs on all pushes to `main`/`dev` and PRs

**What it analyzes**:
- Code smells
- Technical debt
- Security hotspots
- Code coverage trends
- Duplicate code

**Dashboard**: [SonarCloud Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_KC-MVP-server)

---

## Quality Gate Criteria

### ESLint
- No new linting errors in changed files
- Auto-fixable issues should be fixed with: `npm run lint -- --fix`

### TypeScript
- Code must compile successfully
- No type errors

### Tests
- All tests must pass
- Minimum coverage thresholds (configured in jest.config.js)

### Security (Snyk)
- No new high/critical severity vulnerabilities
- Only fails on upgradable/patchable issues

### SonarCloud Quality Gate
- No new bugs
- No new vulnerabilities
- Coverage on new code >= 80%
- Duplicated lines on new code <= 3%

---

## Troubleshooting

### Pre-push hook not running?

Check if husky is installed:
```bash
# At monorepo root
npm install
npx husky install
```

Verify hook exists:
```bash
ls -la .husky/pre-push
# Should be executable (rwxr-xr-x)
```

### ESLint errors?

Fix automatically:
```bash
cd apps/api
npm run lint -- --fix
```

### Test failures?

Run tests locally:
```bash
cd apps/api
npm test
# or with coverage
npm run test:cov
```

### TypeScript compilation errors?

```bash
cd apps/api
npm run build
```

### Snyk not working?

Install and authenticate:
```bash
npm install -g snyk
snyk auth
# Or set SNYK_TOKEN environment variable
```

---

## Configuration Files

- **Pre-push hook**: `.husky/pre-push`
- **Quality gate script**: `apps/api/scripts/check-quality-gate.sh`
- **GitHub Actions**: 
  - `.github/workflows/quality-gate.yml`
  - `.github/workflows/pr-quality-check.yml`
  - `.github/workflows/sonar.yml`
- **ESLint**: `apps/api/.eslintrc.json`
- **Jest**: `apps/api/jest.config.js`
- **SonarCloud**: `apps/api/sonar-project.properties`

---

## Best Practices

1. **Run checks locally before pushing**:
   ```bash
   cd apps/api
   npm run quality:full
   ```

2. **Fix issues incrementally**: Don't wait for CI to fail

3. **Never skip hooks** without a good reason

4. **Review SonarCloud feedback**: It often catches subtle issues

5. **Keep dependencies updated**: Use `npm outdated` regularly

6. **Write tests for new code**: Maintain or improve coverage

---

## Why This Matters

✅ **Catch issues early** - Before they reach CI/CD  
✅ **Faster feedback** - Local checks are faster than CI  
✅ **Better code quality** - Consistent standards  
✅ **Security** - Automatic vulnerability scanning  
✅ **Team productivity** - Less time debugging production issues  

---

## Future Enhancements

- [ ] Add quality gates for mobile app
- [ ] Performance benchmarks
- [ ] Visual regression testing
- [ ] Automated dependency updates (Renovate/Dependabot)
- [ ] Code complexity metrics
