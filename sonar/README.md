# Sonar scripts

Scripts for SonarCloud: fetch issues and block push when blocking issues exist.

## Scripts

| Script | Purpose |
|--------|---------|
| `sonar-report.js` | Fetches all issues from SonarCloud (API + Mobile); writes summary to `docs/SONAR-ALL-ISSUES.md` and full list to `docs/SONAR-ISSUES-FULL.md`. |
| `check-sonar-blocker-critical.js` | Fetches BLOCKER/CRITICAL/HIGH issues; exits with 1 if any exist. Used by the pre-push hook. |
| `pre-push-sonar-check.sh` | Runs Sonar scan for API, then runs the blocker check. Blocks push only when BLOCKER/CRITICAL/HIGH exist. |

## Usage

From repo root:

```bash
# Generate the single issues report (requires SONAR_TOKEN)
SONAR_TOKEN=xxx node sonar/sonar-report.js
# Output: sonar/docs/SONAR-ALL-ISSUES.md, sonar/docs/SONAR-ISSUES-FULL.md

# Pre-push: run Sonar and block on BLOCKER/CRITICAL/HIGH
./sonar/pre-push-sonar-check.sh
# or:  נnpm run sonar:pre-push
```

Get `SONAR_TOKEN` from SonarCloud → My Account → Security.

## Output

- **sonar/docs/SONAR-ALL-ISSUES.md** – Summary: BLOCKER+CRITICAL, MAJOR, top files (API/Mobile), MINOR+INFO.
- **sonar/docs/SONAR-ISSUES-FULL.md** – Full table of all issues (File, Line, Rule, Severity, Message) for API and Mobile. Regenerate after each Sonar scan with `SONAR_TOKEN=xxx node sonar/sonar-report.js`.
