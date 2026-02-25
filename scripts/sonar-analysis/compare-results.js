const fs = require('fs');

const oldIssues = JSON.parse(fs.readFileSync('sonar-api-issues.json', 'utf8'));
const newIssues = JSON.parse(fs.readFileSync('sonar-api-issues-new.json', 'utf8'));

console.log('=== COMPARISON ===');
console.log(`Old total: ${oldIssues.issues.length}`);
console.log(`New total: ${newIssues.issues.length}`);
console.log(`Reduction: ${oldIssues.issues.length - newIssues.issues.length} issues`);

// Stats controller specific
const oldStats = oldIssues.issues.filter(i => i.component.includes('stats.controller.ts'));
const newStats = newIssues.issues.filter(i => i.component.includes('stats.controller.ts'));

console.log('\n=== STATS.CONTROLLER.TS ===');
console.log(`Old: ${oldStats.length} issues`);
console.log(`New: ${newStats.length} issues`);
console.log(`Fixed: ${oldStats.length - newStats.length} issues`);

// By severity
const oldBySev = {};
const newBySev = {};

oldStats.forEach(i => oldBySev[i.severity] = (oldBySev[i.severity] || 0) + 1);
newStats.forEach(i => newBySev[i.severity] = (newBySev[i.severity] || 0) + 1);

console.log('\nOld severity:');
Object.entries(oldBySev).sort((a, b) => b[1] - a[1]).forEach(([sev, count]) => {
  console.log(`  ${sev}: ${count}`);
});

console.log('\nNew severity:');
Object.entries(newBySev).sort((a, b) => b[1] - a[1]).forEach(([sev, count]) => {
  console.log(`  ${sev}: ${count}`);
});

// What's still open
console.log('\n=== REMAINING ISSUES IN STATS.CONTROLLER.TS ===');
const newByRule = {};
newStats.forEach(i => {
  newByRule[i.rule] = (newByRule[i.rule] || []);
  newByRule[i.rule].push(i);
});

Object.entries(newByRule)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([rule, issues]) => {
    console.log(`${rule}: ${issues.length} issues`);
  });
