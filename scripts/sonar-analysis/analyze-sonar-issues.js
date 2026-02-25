const fs = require('fs');

// Read both JSON files
const apiIssues = JSON.parse(fs.readFileSync('sonar-api-issues.json', 'utf8'));
const mobileIssues = JSON.parse(fs.readFileSync('sonar-mobile-issues.json', 'utf8'));

// Analyze issues
function analyzeIssues(issues, projectName) {
  const stats = {
    total: issues.issues.length,
    bySeverity: {},
    byType: {},
    byFile: {},
    byRule: {}
  };

  issues.issues.forEach(issue => {
    // By severity
    stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;
    
    // By type
    stats.byType[issue.type] = (stats.byType[issue.type] || 0) + 1;
    
    // By file
    const file = issue.component.split(':').pop();
    stats.byFile[file] = (stats.byFile[file] || 0) + 1;
    
    // By rule
    stats.byRule[issue.rule] = (stats.byRule[issue.rule] || 0) + 1;
  });

  return stats;
}

const apiStats = analyzeIssues(apiIssues, 'API');
const mobileStats = analyzeIssues(mobileIssues, 'Mobile');

// Create summary
const summary = {
  api: apiStats,
  mobile: mobileStats,
  combined: {
    total: apiStats.total + mobileStats.total,
    bySeverity: {},
    byType: {}
  }
};

// Merge severities
['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'].forEach(sev => {
  summary.combined.bySeverity[sev] = 
    (apiStats.bySeverity[sev] || 0) + (mobileStats.bySeverity[sev] || 0);
});

// Merge types
['BUG', 'VULNERABILITY', 'CODE_SMELL', 'SECURITY_HOTSPOT'].forEach(type => {
  summary.combined.byType[type] = 
    (apiStats.byType[type] || 0) + (mobileStats.byType[type] || 0);
});

// Write summary
fs.writeFileSync('sonar-summary.json', JSON.stringify(summary, null, 2));

// Extract critical and blocker issues
const criticalIssues = {
  api: apiIssues.issues.filter(i => ['BLOCKER', 'CRITICAL'].includes(i.severity)),
  mobile: mobileIssues.issues.filter(i => ['BLOCKER', 'CRITICAL'].includes(i.severity))
};

fs.writeFileSync('sonar-critical-issues.json', JSON.stringify(criticalIssues, null, 2));

console.log('Analysis complete!');
console.log('Total issues:', summary.combined.total);
console.log('By severity:', JSON.stringify(summary.combined.bySeverity, null, 2));
console.log('By type:', JSON.stringify(summary.combined.byType, null, 2));
