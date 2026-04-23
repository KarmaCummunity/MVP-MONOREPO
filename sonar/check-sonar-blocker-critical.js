/**
 * Fetches BLOCKER, CRITICAL and HIGH issues from SonarCloud API and exits with 1 if any exist.
 * Used after a local Sonar scan to block push when blocker/critical/high issues are present.
 * Displays the first 20 issues (by severity order: BLOCKER, CRITICAL, HIGH).
 *
 * Usage: SONAR_TOKEN=xxx node sonar/check-sonar-blocker-critical.js [projectKey]
 * Default projectKey: KarmaCummunity_KC-MVP-server (API)
 */

const https = require('https');

const SONAR_API = 'https://sonarcloud.io/api/issues/search';
const DEFAULT_PROJECT_KEY = 'KarmaCummunity_KC-MVP-server';
const PAGE_SIZE = 500;
const SEVERITIES = 'BLOCKER,CRITICAL,HIGH';
const SHOW_FIRST_N = 20;
const SEVERITY_ORDER = { BLOCKER: 0, CRITICAL: 1, HIGH: 2 };

function fetchPage(projectKey, token, page) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      projectKeys: projectKey,
      ps: String(PAGE_SIZE),
      p: String(page),
      severities: SEVERITIES,
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

async function fetchBlockingIssues(projectKey, token) {
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

  const issues = await fetchBlockingIssues(projectKey, token);

  if (issues.length === 0) {
    console.log('No BLOCKER, CRITICAL or HIGH issues in SonarCloud for project:', projectKey);
    process.exit(0);
  }

  const bySeverity = {
    BLOCKER: issues.filter((i) => i.severity === 'BLOCKER'),
    CRITICAL: issues.filter((i) => i.severity === 'CRITICAL'),
    HIGH: issues.filter((i) => i.severity === 'HIGH'),
  };
  const sorted = [...issues].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
  );
  const toShow = sorted.slice(0, SHOW_FIRST_N);

  console.error('');
  console.error('SonarCloud reported BLOCKER/CRITICAL/HIGH issues. Push blocked.');
  console.error('Project:', projectKey);
  console.error('BLOCKER:', bySeverity.BLOCKER.length, '| CRITICAL:', bySeverity.CRITICAL.length, '| HIGH:', bySeverity.HIGH.length);
  console.error('');
  console.error('First', SHOW_FIRST_N, 'issues:');
  toShow.forEach((i) => console.error(formatIssue(i)));
  if (issues.length > SHOW_FIRST_N) {
    console.error('  ... and', issues.length - SHOW_FIRST_N, 'more');
  }
  console.error('');
  console.error('Fix these issues or run: git push --no-verify to skip (not recommended).');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
