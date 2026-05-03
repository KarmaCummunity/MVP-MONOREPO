/**
 * One-off / CI helper: fetch SonarCloud issues and print English priority markdown to stdout.
 * Requires SONAR_TOKEN, SONAR_PROJECT_KEY_API, and SONAR_PROJECT_KEY_MOBILE
 * (SonarCloud project keys; same values as in each app sonar-project.properties).
 *
 * Optional branch filter: set SONAR_BRANCH to a SonarCloud branch name (e.g. `dev`).
 * Many SonarCloud org/plan tiers return HTTP 403 for `branch` ≠ main on `/api/issues/search`
 * ("Organization is not allowed to access data from non main branches."). If so, omit
 * SONAR_BRANCH — counts follow Sonar’s default scope for your plan (typically **main**).
 */
import https from 'node:https';

/** Only sent when set and non-empty; unset = API default (often main-only on free tier). */
const SONAR_BRANCH = process.env.SONAR_BRANCH?.trim()
  ? process.env.SONAR_BRANCH.trim()
  : '';

const AUTH = Buffer.from(`${process.env.SONAR_TOKEN}:`).toString('base64');

function sonarGet(path) {
  return new Promise((resolve, reject) => {
    https
      .get(
        {
          hostname: 'sonarcloud.io',
          path,
          headers: { Authorization: `Basic ${AUTH}` },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on('error', reject);
  });
}

async function fetchAllIssues(componentKey, branch) {
  const issues = [];
  let page = 1;
  const ps = 500;
  const branchParam =
    branch && String(branch).trim() !== ''
      ? `&branch=${encodeURIComponent(String(branch).trim())}`
      : '';
  for (;;) {
    const path = `/api/issues/search?componentKeys=${encodeURIComponent(componentKey)}&ps=${ps}&p=${page}&issueStatuses=OPEN${branchParam}`;
    const data = await sonarGet(path);
    issues.push(...(data.issues || []));
    if (!data.issues || data.issues.length < ps) break;
    page += 1;
  }
  return issues;
}

function analyze(issues) {
  const bySeverity = {};
  const byType = {};
  const byFile = {};
  const byRule = {};
  for (const i of issues) {
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byType[i.type] = (byType[i.type] || 0) + 1;
    const file = i.component.split(':').pop();
    byFile[file] = (byFile[file] || 0) + 1;
    byRule[i.rule] = (byRule[i.rule] || 0) + 1;
  }
  return {
    total: issues.length,
    bySeverity,
    byType,
    byFile,
    byRule,
    issues,
  };
}

function combine(api, mobile) {
  const sevs = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
  const types = ['BUG', 'VULNERABILITY', 'CODE_SMELL', 'SECURITY_HOTSPOT'];
  const bySeverity = {};
  const byType = {};
  for (const s of sevs) {
    bySeverity[s] = (api.bySeverity[s] || 0) + (mobile.bySeverity[s] || 0);
  }
  for (const t of types) {
    byType[t] = (api.byType[t] || 0) + (mobile.byType[t] || 0);
  }
  return {
    total: api.total + mobile.total,
    bySeverity,
    byType,
  };
}

function topRulesBySeverity(issues, severity, limitRules = 10, topFiles = 5) {
  const filtered = issues.filter((i) => i.severity === severity);
  const byRule = {};
  for (const i of filtered) {
    if (!byRule[i.rule]) byRule[i.rule] = [];
    byRule[i.rule].push(i);
  }
  return Object.entries(byRule)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limitRules)
    .map(([rule, list]) => {
      const fileGroups = {};
      for (const i of list) {
        const f = i.component.split(':').pop();
        fileGroups[f] = (fileGroups[f] || 0) + 1;
      }
      const topFilesList = Object.entries(fileGroups)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topFiles);
      return { rule, count: list.length, topFiles: topFilesList };
    });
}

function topRulesOverall(issues, severity, n = 10) {
  const filtered = issues.filter((i) => i.severity === severity);
  const counts = {};
  for (const i of filtered) {
    counts[i.rule] = (counts[i.rule] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function topFiles(byFile, n = 10) {
  return Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

const sonarProjectKeyApi = process.env.SONAR_PROJECT_KEY_API?.trim();
const sonarProjectKeyMobile = process.env.SONAR_PROJECT_KEY_MOBILE?.trim();
if (!sonarProjectKeyApi || !sonarProjectKeyMobile) {
  console.error(
    'Set SONAR_PROJECT_KEY_API and SONAR_PROJECT_KEY_MOBILE to match sonar.projectKey in ' +
      'apps/api/sonar-project.properties and apps/mobile/sonar-project.properties.',
  );
  process.exit(1);
}

const [apiIssues, mobileIssues] = await Promise.all([
  fetchAllIssues(sonarProjectKeyApi, SONAR_BRANCH),
  fetchAllIssues(sonarProjectKeyMobile, SONAR_BRANCH),
]);

const api = analyze(apiIssues);
const mobile = analyze(mobileIssues);
const combined = combine(api, mobile);

const critApi = topRulesBySeverity(api.issues, 'CRITICAL');
const critMobile = topRulesBySeverity(mobile.issues, 'CRITICAL');
const majorAll = topRulesOverall([...api.issues, ...mobile.issues], 'MAJOR', 10);

const ruleDesc = (r) =>
  ({
    'typescript:S3776': 'Cognitive Complexity - functions are too complex',
    'javascript:S3776': 'Cognitive Complexity - functions are too complex',
    'typescript:S7773': 'Missing type annotations',
    'typescript:S1135': 'TODO comments',
    'typescript:S6582': 'Prefer template literals',
    'typescript:S3358': 'Ternary operators - redundant or complex use',
    'typescript:S1128': 'Unused imports',
    'typescript:S1854': 'Dead stores - unused variables',
    'typescript:S7778': 'React hooks dependencies',
    'typescript:S2004': 'Functions should not be nested too deeply',
    'typescript:S7059': 'Constructors should not contain asynchronous operations',
    'typescript:S125': 'Sections of code should not be commented out',
    'typescript:S6479': 'JSX list components should not use array indexes as key',
    'typescript:S6478': 'React components should not be nested',
    'typescript:S2068': 'Credentials should not be hard-coded',
    'plsql:S1192': 'SQL: String literals duplication',
    'tssecurity:S5145': 'Log injection / user-controlled data in logs',
  }[r] || r);

const now = new Date();
const dateStr = now.toISOString().slice(0, 10);
const iso = now.toISOString();

const branchNote =
  SONAR_BRANCH
    ? `**SonarCloud branch filter:** \`${SONAR_BRANCH}\` (\`branch=…\` on issues API).`
    : '**SonarCloud branch filter:** *(none)* — API uses your org’s default issue scope. On many plans this is **main** only; non-main branch issue APIs may require a higher SonarCloud tier (branch-specific queries can return HTTP 403).';

let md = `# SonarQube troubleshooting priority plan

**Date:** ${dateStr}
**Scan from SonarCloud:** https://sonarcloud.io

${branchNote}

**Issue scope:** Counts reflect **OPEN** issues only (\`issueStatuses=OPEN\`), i.e. the current SonarCloud backlog (not all-time history).

---

## Status summary

### General statistics

- **Total problems:** ${combined.total}
- **BLOCKER:** ${combined.bySeverity.BLOCKER || 0} ✅
- **CRITICAL:** ${combined.bySeverity.CRITICAL || 0} ⚠️
- **MAJOR:** ${combined.bySeverity.MAJOR || 0}
- **MINOR:** ${combined.bySeverity.MINOR || 0}
- **INFO:** ${combined.bySeverity.INFO || 0}

### Segmentation by project

#### apps/api (Backend)
- Total: ${api.total} problems
- CRITICAL: ${api.bySeverity.CRITICAL || 0}
- MAJOR: ${api.bySeverity.MAJOR || 0}
- MINOR: ${api.bySeverity.MINOR || 0}
- INFO: ${api.bySeverity.INFO || 0}

#### apps/mobile (React Native)
- Total: ${mobile.total} problems
- CRITICAL: ${mobile.bySeverity.CRITICAL || 0}
- MAJOR: ${mobile.bySeverity.MAJOR || 0}
- MINOR: ${mobile.bySeverity.MINOR || 0}
- INFO: ${mobile.bySeverity.INFO || 0}

### Segmentation by type

- **CODE_SMELL:** ${combined.byType.CODE_SMELL || 0} (${combined.total ? (((combined.byType.CODE_SMELL || 0) / combined.total) * 100).toFixed(1) : '0'}%)
- **BUG:** ${combined.byType.BUG || 0}
- **VULNERABILITY:** ${combined.byType.VULNERABILITY || 0} 🔴
- **SECURITY_HOTSPOT:** ${combined.byType.SECURITY_HOTSPOT || 0}

---

## 📋 Priority 1: CRITICAL Issues (${combined.bySeverity.CRITICAL || 0})

### Top Rules - API

`;

for (const { rule, count, topFiles: tf } of critApi) {
  md += `#### ${rule} - ${ruleDesc(rule)}
- **Quantity:** ${count} problems
- **Affected files:**
`;
  for (const [file, c] of tf) {
    md += `  - \`${file}\` (${c})\n`;
  }
  md += '\n';
}

md += `### Top Rules - Mobile

`;

for (const { rule, count, topFiles: tf } of critMobile) {
  md += `#### ${rule} - ${ruleDesc(rule)}
- **Quantity:** ${count} problems
- **Affected files:**
`;
  for (const [file, c] of tf) {
    md += `  - \`${file}\` (${c})\n`;
  }
  md += '\n';
}

md += `---

## 📋 Priority 2: MAJOR Issues (${combined.bySeverity.MAJOR || 0})

### Top 10 Rules with the most MAJOR issues

`;

for (const [rule, count] of majorAll) {
  md += `- **${rule}**: ${count} problems - ${ruleDesc(rule)}\n`;
}

md += `
---

## 📊 Analysis by problematic files

### Top 10 files with the most problems - API

`;

let rank = 1;
for (const [file, count] of topFiles(api.byFile)) {
  md += `${rank}. \`${file}\` - ${count} issues\n`;
  rank++;
}

md += `
### Top 10 files with the most problems - Mobile

`;

rank = 1;
for (const [file, count] of topFiles(mobile.byFile)) {
  md += `${rank}. \`${file}\` - ${count} issues\n`;
  rank++;
}

const allVulns = [...api.issues, ...mobile.issues].filter((i) => i.type === 'VULNERABILITY');
md += `
---

## 🔒 Security problems (VULNERABILITY)

${allVulns.length === 1 ? '1 open vulnerability' : `${allVulns.length} open vulnerabilities`} across analyzed projects (see below).

`;

for (const v of allVulns) {
  const file = v.component.split(':').pop();
  let proj = v.project;
  if (v.project === sonarProjectKeyApi) proj = 'api';
  else if (v.project === sonarProjectKeyMobile) proj = 'mobile';
  md += `- **${v.rule}** (${proj}) in file \`${file}\` line ${v.line ?? '—'}
  - Message: ${v.message}

`;
}

if (allVulns.length === 0) {
  md += '- None reported in open issues.\n\n';
}

md += `---

## 📈 Recommended solution strategy

### Step 1: Security problems (Vulnerabilities)
**Estimated time:** 1-2 hours
- [ ] Resolve open vulnerabilities
- [ ] Review security hotspots

### Step 2: CRITICAL Issues - Complexity (S3776)
**Estimated time:** 3-5 days
- [ ] Refactor highly complex functions (see Priority 1 lists)
- Approach: extract smaller functions and reduce branching

### Step 3: Type safety and other CRITICAL rules
**Estimated time:** 2-3 days
- [ ] Address remaining CRITICAL findings (SQL literals, pl/sql checks, etc.)

### Step 4: MAJOR Issues - in descending order of importance
**Estimated time:** 1-2 weeks
1. React hooks dependencies (S7778) - ${(api.byRule['typescript:S7778'] || 0) + (mobile.byRule['typescript:S7778'] || 0)} issues
2. Template literals (S6582) - ${(api.byRule['typescript:S6582'] || 0) + (mobile.byRule['typescript:S6582'] || 0)} issues
3. Ternary operators (S3358) - ${(api.byRule['typescript:S3358'] || 0) + (mobile.byRule['typescript:S3358'] || 0)} issues

### Step 5: MINOR + INFO
**Estimated time:** 1 week
- [ ] Removing unused imports
- [ ] Removal of dead stores
- [ ] Treatment of TODO comments

### Step 6: Automation
- [ ] Align ESLint rules with SonarQube where practical
- [ ] Pre-commit hooks
- [ ] CI/CD integration (already on SonarCloud)

---

## 🎯 Goals

### short term (week 1-2)
- ✅ 0 BLOCKER issues (target)
- 🎯 0 CRITICAL issues
- 🎯 0 VULNERABILITY issues

### medium term (week 3-6)
- 🎯 <50 MAJOR issues (80% reduction from baseline)
- 🎯 <200 MINOR issues (50% reduction from baseline)

### Long term (month 2-3)
- 🎯 Quality Gate: PASSED
- 🎯 <10 MAJOR issues in total
- 🎯 Code coverage >70%
- 🎯 Full automation in CI/CD

---

## Useful links

- [SonarCloud - API Project](https://sonarcloud.io/dashboard?id=${sonarProjectKeyApi})
- [SonarCloud - Mobile Project](https://sonarcloud.io/dashboard?id=${sonarProjectKeyMobile})
- [SonarQube TypeScript Rules](https://rules.sonarsource.com/typescript/)

---

**Last update:** ${iso}
`;

process.stdout.write(md);
