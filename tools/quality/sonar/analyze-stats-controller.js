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

const statsIssues = apiIssues.issues.filter((i) =>
  i.component.includes('stats.controller.ts')
);

const bySeverity = {};
const byRule = {};

statsIssues.forEach((issue) => {
  bySeverity[issue.severity] = bySeverity[issue.severity] || [];
  bySeverity[issue.severity].push(issue);

  byRule[issue.rule] = byRule[issue.rule] || [];
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
    console.log(`    Lines: ${issues.map((i) => i.line).join(', ')}`);
  });

const outFile = path.join(OUT, 'stats-controller-issues.json');
fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      total: statsIssues.length,
      bySeverity,
      byRule,
      allIssues: statsIssues.map((i) => ({
        line: i.line,
        rule: i.rule,
        severity: i.severity,
        message: i.message
      }))
    },
    null,
    2
  )
);

console.log(`\n✅ Saved detailed report to ${outFile}`);
