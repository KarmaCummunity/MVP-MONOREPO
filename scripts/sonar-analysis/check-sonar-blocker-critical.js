/**
 * Fetches BLOCKER and CRITICAL issues from SonarCloud API and exits with 1 if any exist.
 * Used after a local Sonar scan to block push when critical/blocker issues are present.
 *
 * Usage: SONAR_TOKEN=xxx node scripts/sonar-analysis/check-sonar-blocker-critical.js [projectKey]
 * Default projectKey: KarmaCummunity_KC-MVP-server (API)
 */

const https = require('https');

const SONAR_API = 'https://sonarcloud.io/api/issues/search';
const DEFAULT_PROJECT_KEY = 'KarmaCummunity_KC-MVP-server';
const PAGE_SIZE = 500;

function fetchPage(projectKey, token, page, severities) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      projectKeys: projectKey,
      ps: String(PAGE_SIZE),
      p: String(page),
      severities: severities || 'BLOCKER,CRITICAL',
    });
    const url = `${SONAR_API}?${params.toString()}`;
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

async function fetchBlockerCriticalIssues(projectKey, token) {
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

function formatIssue(issue) {
  const file = issue.component ? issue.component.split(':').pop() : '?';
  const line = issue.line != null ? `:${issue.line}` : '';
  return `  - [${issue.severity}] ${file}${line}: ${issue.message || issue.rule}`;
}

async function main() {
  const token = process.env.SONAR_TOKEN;
  if (!token) {
    console.error('SONAR_TOKEN is required (SonarCloud → My Account → Security).');
    process.exit(1);
  }

  const projectKey = process.argv[2] || DEFAULT_PROJECT_KEY;

  const issues = await fetchBlockerCriticalIssues(projectKey, token);

  if (issues.length === 0) {
    console.log('No BLOCKER or CRITICAL issues in SonarCloud for project:', projectKey);
    process.exit(0);
  }

  const blocker = issues.filter((i) => i.severity === 'BLOCKER');
  const critical = issues.filter((i) => i.severity === 'CRITICAL');

  console.error('');
  console.error('SonarCloud reported BLOCKER/CRITICAL issues. Push blocked.');
  console.error('Project:', projectKey);
  console.error('BLOCKER:', blocker.length, '| CRITICAL:', critical.length);
  console.error('');
  if (blocker.length > 0) {
    console.error('BLOCKER:');
    blocker.slice(0, 20).forEach((i) => console.error(formatIssue(i)));
    if (blocker.length > 20) console.error('  ... and', blocker.length - 20, 'more');
    console.error('');
  }
  if (critical.length > 0) {
    console.error('CRITICAL:');
    critical.slice(0, 20).forEach((i) => console.error(formatIssue(i)));
    if (critical.length > 20) console.error('  ... and', critical.length - 20, 'more');
  }
  console.error('');
  console.error('Fix these issues or run: git push --no-verify to skip (not recommended).');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
