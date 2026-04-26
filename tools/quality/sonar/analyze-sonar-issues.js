const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const OUT = path.join(__dirname, 'out');

if (!fs.existsSync(OUT)) {
  fs.mkdirSync(OUT, { recursive: true });
}

const apiIssues = JSON.parse(
  fs.readFileSync(path.join(DATA, 'sonar-api-issues.json'), 'utf8')
);
const mobileIssues = JSON.parse(
  fs.readFileSync(path.join(DATA, 'sonar-mobile-issues.json'), 'utf8')
);

function analyzeIssues(issues) {
  const stats = {
    total: issues.issues.length,
    bySeverity: {},
    byType: {},
    byFile: {},
    byRule: {}
  };

  issues.issues.forEach((issue) => {
    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
    stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1;
    const file = issue.component.split(':').pop();
    stats.byFile[file] = (stats.byFile[file] || 0) + 1;
    stats.byRule[issue.rule] = (stats.byRule[issue.rule] || 0) + 1;
  });

  return stats;
}

const apiStats = analyzeIssues(apiIssues);
const mobileStats = analyzeIssues(mobileIssues);

const summary = {
  api: apiStats,
  mobile: mobileStats,
  combined: {
    total: apiStats.total + mobileStats.total,
    bySeverity: {},
    byType: {}
  }
};

['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'].forEach((sev) => {
  summary.combined.bySeverity[sev] =
    (apiStats.bySeverity[sev] || 0) + (mobileStats.bySeverity[sev] || 0);
});

['BUG', 'VULNERABILITY', 'CODE_SMELL', 'SECURITY_HOTSPOT'].forEach((type) => {
  summary.combined.byType[type] =
    (apiStats.byType[type] || 0) + (mobileStats.byType[type] || 0);
});

fs.writeFileSync(path.join(OUT, 'sonar-summary.json'), JSON.stringify(summary, null, 2));

const criticalIssues = {
  api: apiIssues.issues.filter((i) => ['BLOCKER', 'CRITICAL'].includes(i.severity)),
  mobile: mobileIssues.issues.filter((i) => ['BLOCKER', 'CRITICAL'].includes(i.severity))
};

fs.writeFileSync(
  path.join(OUT, 'sonar-critical-issues.json'),
  JSON.stringify(criticalIssues, null, 2)
);

console.log('Analysis complete!');
console.log('Total issues:', summary.combined.total);
console.log('By severity:', JSON.stringify(summary.combined.bySeverity, null, 2));
console.log('By type:', JSON.stringify(summary.combined.byType, null, 2));
