/**
 * Fetches SonarCloud Quality Gate status and issue list, then prints failed conditions
 * and issues with file:line so the log shows exactly what failed and where.
 *
 * Run after a failed sonar-scanner (e.g. from sonar:local) to see which conditions
 * failed and which lines have issues. Requires SONAR_TOKEN (SonarCloud → My Account → Security).
 *
 * Usage: SONAR_TOKEN=xxx node scripts/print-sonar-gate-details.js [projectKey]
 * Default projectKey: KarmaCummunity_KC-MVP-server
 */

const https = require('https');

const SONAR_HOST = 'sonarcloud.io';
const DEFAULT_PROJECT_KEY = 'KarmaCummunity_KC-MVP-server';
const ISSUES_PAGE_SIZE = 100;
const MAX_ISSUES_TO_PRINT = 200;

function get(url, token) {
  return new Promise((resolve, reject) => {
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

async function fetchQualityGateStatus(projectKey, token) {
  const url = `https://${SONAR_HOST}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`;
  return get(url, token);
}

async function fetchIssuesPage(projectKey, token, page) {
  const params = new URLSearchParams({
    projectKeys: projectKey,
    ps: String(ISSUES_PAGE_SIZE),
    p: String(page),
  });
  const url = `https://${SONAR_HOST}/api/issues/search?${params.toString()}`;
  return get(url, token);
}

async function fetchAllIssues(projectKey, token, maxIssues = 500) {
  const all = [];
  let page = 1;
  let total = 0;
  do {
    const body = await fetchIssuesPage(projectKey, token, page);
    const issues = body.issues || [];
    const paging = body.paging || {};
    if (page === 1) total = paging.total || issues.length;
    all.push(...issues);
    if (issues.length < ISSUES_PAGE_SIZE || all.length >= total || all.length >= maxIssues) break;
    page++;
  } while (true);
  return all;
}

function formatCondition(c) {
  const metric = c.metricKey || '?';
  const actual = c.actualValue != null ? c.actualValue : 'N/A';
  const threshold = c.errorThreshold != null ? c.errorThreshold : 'N/A';
  const comparator = c.comparator || '';
  return `  ${metric}: actual=${actual} (threshold: ${comparator} ${threshold})`;
}

function formatIssue(i) {
  const file = i.component ? i.component.split(':').pop() : '?';
  const line = i.line != null ? `:${i.line}` : '';
  const severity = i.severity || '';
  const rule = i.rule || '';
  const msg = (i.message || '').replace(/\n/g, ' ');
  return `  ${file}${line}  [${severity}] ${rule}  ${msg}`;
}

async function main() {
  const token = process.env.SONAR_TOKEN;
  if (!token) {
    console.error('');
    console.error('SONAR_TOKEN is not set. To see Quality Gate details and issue lines, set it:');
    console.error('  SonarCloud → My Account → Security → Generate token');
    console.error('  Then: SONAR_TOKEN=xxx node scripts/print-sonar-gate-details.js');
    console.error('');
    process.exit(0);
  }

  const projectKey = process.argv[2] || DEFAULT_PROJECT_KEY;

  console.error('');
  console.error('=== SonarCloud Quality Gate details ===');
  console.error('Project:', projectKey);
  console.error('');

  try {
    const statusBody = await fetchQualityGateStatus(projectKey, token);
    const ps = statusBody.projectStatus || {};
    const overall = ps.status || 'UNKNOWN';
    const conditions = ps.conditions || [];

    console.error('Overall status:', overall);
    console.error('');

    const failed = conditions.filter((c) => (c.status || '').toUpperCase() === 'ERROR');
    if (failed.length > 0) {
      console.error('Failed conditions:');
      failed.forEach((c) => console.error(formatCondition(c)));
      console.error('');
    } else if (overall !== 'OK' && overall !== 'NONE') {
      console.error('Conditions (all):');
      conditions.forEach((c) => {
        console.error(`  [${c.status}]`, formatCondition(c));
      });
      console.error('');
    }

    console.error('--- Issues (file:line, severity, rule, message) ---');
    const issues = await fetchAllIssues(projectKey, token, MAX_ISSUES_TO_PRINT);
    const bySeverity = (s) => issues.filter((i) => (i.severity || '') === s);
    const order = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
    const sorted = [];
    for (const sev of order) {
      sorted.push(...bySeverity(sev));
    }
    const toPrint = sorted.slice(0, MAX_ISSUES_TO_PRINT);
    toPrint.forEach((i) => console.error(formatIssue(i)));
    if (issues.length > MAX_ISSUES_TO_PRINT) {
      console.error(`  ... and ${issues.length - MAX_ISSUES_TO_PRINT} more (see SonarCloud dashboard)`);
    }
    console.error('');
    console.error('Dashboard: https://sonarcloud.io/project/issues?id=' + encodeURIComponent(projectKey));
    console.error('');
  } catch (err) {
    console.error('Error fetching SonarCloud data:', err.message);
    process.exit(1);
  }
}

main();
