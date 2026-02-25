const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'eslint-report.json');
try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    let ruleCounts = {};
    data.forEach(file => {
        file.messages.forEach(msg => {
            ruleCounts[msg.ruleId] = (ruleCounts[msg.ruleId] || 0) + 1;
        });
    });
    console.log('Rule counts:');
    Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).forEach(m => console.log(`${m[0]}: ${m[1]}`));
} catch (e) { console.error(e); }
