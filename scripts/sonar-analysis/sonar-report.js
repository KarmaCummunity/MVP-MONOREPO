/**
 * Fetches current issues from SonarCloud API and writes sonar-all-issues.md.
 * Run after Sonar (CI or local); needs SONAR_TOKEN (SonarCloud → My Account → Security).
 *
 * Usage: SONAR_TOKEN=xxx node scripts/sonar-analysis/sonar-report.js
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const SONAR_API = 'https://sonarcloud.io/api/issues/search';
const API_PROJECT = 'KarmaCummunity_KC-MVP-server';
const MOBILE_PROJECT = 'KarmaCummunity_MVP';
const PAGE_SIZE = 500;
const rootDir = path.resolve(__dirname, '../..');

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

  let md = '';

  // BLOCKER + CRITICAL
  md += `## BLOCKER + CRITICAL (${criticalTotal})\n\n`;

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
  md += `## MAJOR (${majorTotal})\n\n`;
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
  md += '## Top files by issue count (API)\n\n';
  Object.entries(apiByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count], i) => {
      md += `${i + 1}. \`${file}\` – ${count}  \n`;
    });
  md += '\n---\n\n';

  md += '## Top files by issue count (Mobile)\n\n';
  Object.entries(mobileByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([file, count], i) => {
      md += `${i + 1}. \`${file}\` – ${count}  \n`;
    });
  md += '\n---\n\n';

  md += `## MINOR + INFO (${minorInfo})\n\n`;
  md += '- Unused imports, dead stores, TODO/FIXME comments, style issues.\n';
  md += '- Fix incrementally; re-run this script after Sonar for current counts.\n\n';
  md += '---\n\n';
  md += '*Generated from SonarCloud. Run: `SONAR_TOKEN=xxx node scripts/sonar-analysis/sonar-report.js` (or in CI after SonarCloud Scan).*\n';

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

  const md = buildMd(apiIssues, mobileIssues);
  const outPath = path.join(rootDir, 'sonar-all-issues.md');
  fs.writeFileSync(outPath, md);
  console.log('Written:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
