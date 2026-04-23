/**
 * Fetches current issues from SonarCloud API and writes consolidated reports.
 * Run after Sonar (CI or local); needs SONAR_TOKEN (SonarCloud → My Account → Security).
 *
 * Usage: SONAR_TOKEN=xxx node sonar/sonar-report.js
 * Output: sonar/docs/SONAR-ALL-ISSUES.md (summary), sonar/docs/SONAR-ISSUES-FULL.md (all issues table)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const SONAR_API = 'https://sonarcloud.io/api/issues/search';
const API_PROJECT = 'KarmaCummunity_KC-MVP-server';
const MOBILE_PROJECT = 'KarmaCummunity_MVP';
const PAGE_SIZE = 500;

const REPO_ROOT = path.join(__dirname, '..');
const API_ROOT = path.join(REPO_ROOT, 'apps', 'api');
const MOBILE_ROOT = path.join(REPO_ROOT, 'apps', 'mobile');

/** Sonar component is "projectKey:path"; path is relative to project root (e.g. apps/api or apps/mobile). */
function getComponentRelativePath(componentStr) {
  if (!componentStr || !componentStr.includes(':')) return null;
  return componentStr.split(':').slice(1).join(':').trim();
}

function resolveApiFilePath(componentStr) {
  const rel = getComponentRelativePath(componentStr);
  return rel ? path.join(API_ROOT, rel) : null;
}

function resolveMobileFilePath(componentStr) {
  const rel = getComponentRelativePath(componentStr);
  return rel ? path.join(MOBILE_ROOT, rel) : null;
}

/** Keep only issues for files that exist in the repo (removes stale/deleted/moved files). */
function filterIssuesToExistingFiles(issues, resolvePath) {
  return issues.filter((i) => {
    const abs = resolvePath(i.component);
    return abs && fs.existsSync(abs);
  });
}

const RULE_DESC = {
  'typescript:S3776': 'Cognitive Complexity',
  'typescript:S3358': 'Ternary operators – simplify or avoid',
  'typescript:S6582': 'Prefer template literals over string concatenation',
  'typescript:S1854': 'Dead stores – unused variable assignments',
  'typescript:S6590': 'React props spreading',
  'typescript:S2933': 'Class fields should be readonly',
  'typescript:S4165': 'Empty array destructuring',
  'typescript:S1788': '(see Sonar rule)',
  'typescript:S107': 'Too many parameters',
  'tssecurity:S5145': 'Vulnerability – do not log user-controlled data',
  'plsql:S1192': 'SQL string literals duplication',
  'plsql:LiteralsNonPrintableCharactersCheck': 'Non-printable characters in literals',
};

function getDesc(rule) {
  return RULE_DESC[rule] || '(see Sonar rule)';
}

function fetchPage(projectKey, token, page) {
  return new Promise((resolve, reject) => {
    const url = `${SONAR_API}?projectKeys=${encodeURIComponent(projectKey)}&ps=${PAGE_SIZE}&p=${page}`;
    https
      .get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from SonarCloud API'));
          }
        });
      })
      .on('error', reject);
  });
}

async function fetchAllIssues(projectKey, token) {
  const allIssues = [];
  let page = 1;
  let total = 0;
  do {
    const body = await fetchPage(projectKey, token, page);
    const issues = body.issues || [];
    const totalFromApi = body.paging ? body.paging.total : issues.length;
    if (page === 1) total = totalFromApi;
    allIssues.push(...issues);
    if (issues.length < PAGE_SIZE || allIssues.length >= total) break;
    page++;
  } while (true);
  return allIssues;
}

function byFile(issues) {
  const out = {};
  issues.forEach((i) => {
    const file = i.component.split(':').pop();
    out[file] = (out[file] || 0) + 1;
  });
  return out;
}

function byRule(issues) {
  const out = {};
  issues.forEach((i) => {
    if (!out[i.rule]) out[i.rule] = [];
    out[i.rule].push(i);
  });
  return out;
}

function fileList(issues, maxItems = 10) {
  const counts = byFile(issues);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([f, c]) => `\`${f}\` (${c})`)
    .join(', ');
}

function buildMd(apiIssues, mobileIssues) {
  const apiCritical = apiIssues.filter((i) => i.severity === 'CRITICAL');
  const apiBlocker = apiIssues.filter((i) => i.severity === 'BLOCKER');
  const mobileCritical = mobileIssues.filter((i) => i.severity === 'CRITICAL');
  const mobileBlocker = mobileIssues.filter((i) => i.severity === 'BLOCKER');
  const apiMajor = apiIssues.filter((i) => i.severity === 'MAJOR');
  const mobileMajor = mobileIssues.filter((i) => i.severity === 'MAJOR');

  const apiByFile = byFile(apiIssues);
  const mobileByFile = byFile(mobileIssues);
  const criticalTotal =
    apiCritical.length + apiBlocker.length + mobileCritical.length + mobileBlocker.length;
  const majorTotal = apiMajor.length + mobileMajor.length;
  const minorInfo =
    apiIssues.filter((i) => i.severity === 'MINOR' || i.severity === 'INFO').length +
    mobileIssues.filter((i) => i.severity === 'MINOR' || i.severity === 'INFO').length;
  const totalIssues = apiIssues.length + mobileIssues.length;

  let md = '';
  md += '# SonarCloud – All Issues (single reference)\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += 'Refresh: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.\n\n';
  md += '---\n\n## 1. Summary\n\n';
  md += `| Project | Total | BLOCKER | CRITICAL | MAJOR | MINOR | INFO |\n`;
  md += `|---------|-------|---------|----------|-------|-------|------|\n`;
  md += `| **API** | ${apiIssues.length} | ${(apiBlocker.length)} | ${apiCritical.length} | ${apiMajor.length} | ${apiIssues.filter((i) => i.severity === 'MINOR').length} | ${apiIssues.filter((i) => i.severity === 'INFO').length} |\n`;
  md += `| **Mobile** | ${mobileIssues.length} | ${mobileBlocker.length} | ${mobileCritical.length} | ${mobileMajor.length} | ${mobileIssues.filter((i) => i.severity === 'MINOR').length} | ${mobileIssues.filter((i) => i.severity === 'INFO').length} |\n`;
  md += `| **Total** | **${totalIssues}** | **${apiBlocker.length + mobileBlocker.length}** | **${apiCritical.length + mobileCritical.length}** | **${majorTotal}** | - | - |\n\n`;
  md += '---\n\n';

  // BLOCKER + CRITICAL
  md += `## 2. BLOCKER + CRITICAL (${criticalTotal})\n\n`;

  const apiHigh = [...apiBlocker, ...apiCritical];
  const apiHighByRule = byRule(apiHigh);
  Object.entries(apiHighByRule)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([rule, issues]) => {
      md += `### API – ${rule} (${getDesc(rule)})\n`;
      md += `- ${issues.length} issues in: ${fileList(issues)}.\n\n`;
    });

  const vulns = apiIssues.filter((i) => i.type === 'VULNERABILITY');
  vulns.forEach((v) => {
    const file = v.component.split(':').pop();
    if (!md.includes(`${v.rule}`) || !md.includes(file)) {
      md += `### API – ${v.rule} (Vulnerability)\n`;
      md += `- ${v.message || 'See Sonar'} – e.g. \`${file}\`\n\n`;
    }
  });

  const mobileHigh = [...mobileBlocker, ...mobileCritical];
  const mobileHighByRule = byRule(mobileHigh);
  Object.entries(mobileHighByRule)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([rule, issues]) => {
      md += `### Mobile – ${rule} (${getDesc(rule)})\n`;
      md += `- ${issues.length} issues in: ${fileList(issues)}.\n\n`;
    });

  md += '---\n\n';

  // MAJOR
  md += `## 3. MAJOR (${majorTotal})\n\n`;
  const allMajor = [...apiMajor, ...mobileMajor];
  const majorByRule = {};
  allMajor.forEach((i) => {
    majorByRule[i.rule] = (majorByRule[i.rule] || 0) + 1;
  });
  md += '| Rule | Count | Description |\n|------|-------|-------------|\n';
  Object.entries(majorByRule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([rule, count]) => {
      md += `| ${rule} | ${count} | ${getDesc(rule)} |\n`;
    });
  md += '\n---\n\n';

  // Top files
  md += '## 4. Top files by issue count (API)\n\n';
  Object.entries(apiByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count], i) => {
      md += `${i + 1}. \`${file}\` – ${count}  \n`;
    });
  md += '\n---\n\n';

  md += '## 5. Top files by issue count (Mobile)\n\n';
  Object.entries(mobileByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count], i) => {
      md += `${i + 1}. \`${file}\` – ${count}  \n`;
    });
  md += '\n---\n\n';

  md += `## 6. MINOR + INFO (${minorInfo})\n\n`;
  md += '- Unused imports, dead stores, TODO/FIXME comments, style issues.\n';
  md += '- Fix incrementally; re-run this script after Sonar for current counts.\n\n';
  md += '---\n\n';
  md += '*Generated from SonarCloud. Run: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.*\n';

  return md;
}

const SEVERITY_ORDER = { BLOCKER: 0, CRITICAL: 1, MAJOR: 2, MINOR: 3, INFO: 4 };

function sortIssues(issues) {
  return [...issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );
}

function buildFullIssuesMd(apiIssues, mobileIssues) {
  let md = '';
  md += '# SonarCloud – Full issues list\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += 'Refresh: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.\n\n';
  md += '---\n\n';

  const formatIssueLine = (i) => {
    const file = i.component ? i.component.split(':').pop() : '?';
    const line = i.line != null ? i.line : '-';
    return `| \`${file}\` | ${line} | ${(i.rule || '').replace(/\|/g, '\\|')} | ${(i.severity || '').replace(/\|/g, '\\|')} | ${(i.message || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`;
  };

  const writeProjectSection = (title, issues) => {
    if (issues.length === 0) return '';
    let section = `## ${title} (${issues.length} issues)\n\n`;
    section += '| File | Line | Rule | Severity | Message |\n';
    section += '|------|------|------|----------|--------|\n';
    sortIssues(issues).forEach((i) => {
      section += formatIssueLine(i) + '\n';
    });
    section += '\n';
    return section;
  };

  md += writeProjectSection('API – All issues', apiIssues);
  md += writeProjectSection('Mobile – All issues', mobileIssues);
  md += '---\n\n';
  md += '*Generated from SonarCloud. Run: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.*\n';
  return md;
}

async function main() {
  const token = process.env.SONAR_TOKEN;
  if (!token) {
    console.error('SONAR_TOKEN is required (SonarCloud → My Account → Security).');
    process.exit(1);
  }

  console.log('Fetching API project...');
  const apiIssues = await fetchAllIssues(API_PROJECT, token);
  console.log('API issues:', apiIssues.length);

  console.log('Fetching Mobile project...');
  const mobileIssues = await fetchAllIssues(MOBILE_PROJECT, token);
  console.log('Mobile issues:', mobileIssues.length);

  const docsDir = path.join(__dirname, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const summaryMd = buildMd(apiIssues, mobileIssues);
  const summaryPath = path.join(docsDir, 'SONAR-ALL-ISSUES.md');
  fs.writeFileSync(summaryPath, summaryMd);
  console.log('Written:', summaryPath);

  const fullMd = buildFullIssuesMd(apiIssues, mobileIssues);
  const fullPath = path.join(docsDir, 'SONAR-ISSUES-FULL.md');
  fs.writeFileSync(fullPath, fullMd);
  console.log('Written:', fullPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
