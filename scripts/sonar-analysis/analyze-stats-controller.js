const fs = require('fs');

const apiIssues = JSON.parse(fs.readFileSync('sonar-api-issues.json', 'utf8'));

// Filter issues for stats.controller.ts
const statsIssues = apiIssues.issues.filter(i => 
  i.component.includes('stats.controller.ts')
);

// Group by severity and rule
const bySeverity = {};
const byRule = {};

statsIssues.forEach(issue => {
  bySeverity[issue.severity] = (bySeverity[issue.severity] || []);
  bySeverity[issue.severity].push(issue);
  
  byRule[issue.rule] = (byRule[issue.rule] || []);
  byRule[issue.rule].push(issue);
});

console.log('Total issues in stats.controller.ts:', statsIssues.length);
console.log('\nBy Severity:');
Object.entries(bySeverity).forEach(([sev, issues]) => {
  console.log(`  ${sev}: ${issues.length}`);
});

console.log('\nBy Rule (top 10):');
Object.entries(byRule)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([rule, issues]) => {
    console.log(`  ${rule}: ${issues.length} issues`);
    console.log(`    Lines: ${issues.map(i => i.line).join(', ')}`);
  });

// Save detailed report
fs.writeFileSync('stats-controller-issues.json', JSON.stringify({
  total: statsIssues.length,
  bySeverity,
  byRule,
  allIssues: statsIssues.map(i => ({
    line: i.line,
    rule: i.rule,
    severity: i.severity,
    message: i.message
  }))
}, null, 2));

console.log('\n✅ Saved detailed report to stats-controller-issues.json');
