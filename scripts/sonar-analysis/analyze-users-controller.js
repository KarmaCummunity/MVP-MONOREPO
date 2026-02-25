const fs = require('fs');

const apiIssues = JSON.parse(fs.readFileSync('sonar-api-issues-new.json', 'utf8'));

const usersIssues = apiIssues.issues.filter(i => 
  i.component.includes('users.controller.ts')
);

const bySeverity = {};
const byRule = {};

usersIssues.forEach(issue => {
  bySeverity[issue.severity] = (bySeverity[issue.severity] || []);
  bySeverity[issue.severity].push(issue);
  
  byRule[issue.rule] = (byRule[issue.rule] || []);
  byRule[issue.rule].push(issue);
});

console.log('Total issues in users.controller.ts:', usersIssues.length);
console.log('\nBy Severity:');
Object.entries(bySeverity).forEach(([sev, issues]) => {
  console.log(`  ${sev}: ${issues.length}`);
});

console.log('\nBy Rule (all):');
Object.entries(byRule)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([rule, issues]) => {
    console.log(`  ${rule}: ${issues.length} issues`);
    const lines = issues.map(i => i.line).sort((a, b) => a - b);
    console.log(`    Lines: ${lines.slice(0, 10).join(', ')}${lines.length > 10 ? '...' : ''}`);
  });

fs.writeFileSync('users-controller-issues.json', JSON.stringify({
  total: usersIssues.length,
  bySeverity,
  byRule,
  allIssues: usersIssues.map(i => ({
    line: i.line,
    rule: i.rule,
    severity: i.severity,
    message: i.message
  }))
}, null, 2));

console.log('\n✅ Saved detailed report to users-controller-issues.json');
