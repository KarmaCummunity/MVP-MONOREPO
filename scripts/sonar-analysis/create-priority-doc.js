const fs = require('fs');

const apiIssues = JSON.parse(fs.readFileSync('sonar-api-issues.json', 'utf8'));
const mobileIssues = JSON.parse(fs.readFileSync('sonar-mobile-issues.json', 'utf8'));
const summary = JSON.parse(fs.readFileSync('sonar-summary.json', 'utf8'));

// Rule descriptions mapping
const ruleDescriptions = {
  'typescript:S3776': 'Cognitive Complexity - פונקציות מורכבות מדי',
  'typescript:S7773': 'Type annotations - חסרות הגדרות טיפוס',
  'typescript:S1135': 'TODO comments - יש להסיר או לטפל',
  'typescript:S6582': 'Prefer template literals - להשתמש ב-template strings',
  'typescript:S3358': 'Ternary operators - שימוש מיותר או מורכב',
  'typescript:S1128': 'Unused imports - ייבואים לא בשימוש',
  'typescript:S1854': 'Dead stores - משתנים שלא בשימוש',
  'typescript:S7778': 'React hooks dependencies - חסרות תלויות',
  'typescript:S2486': 'Generic exceptions - צריך exceptions ספציפיות',
  'typescript:S4325': 'Type assertions - שימוש לא בטוח ב-as',
  'typescript:S7735': 'Async function without await',
  'typescript:S3863': 'Boolean expressions - ניתן לפשט',
  'typescript:S4165': 'Empty array destructuring',
  'typescript:S6606': 'Object spread properties',
  'typescript:S7781': 'React fragments - שימוש מיותר',
  'typescript:S7772': 'React state update - בעיות עדכון state',
  'typescript:S2933': 'Class fields - צריך readonly',
  'typescript:S6660': 'Promise constructor - שימוש מיותר',
  'typescript:S7764': 'React hooks - שימוש לא תקין',
  'typescript:S6590': 'React props spreading',
  'typescript:S7785': 'Component naming',
  'typescript:S7776': 'React key prop',
  'tssecurity:S5145': 'SECURITY: Log injection vulnerability',
  'plsql:S1192': 'SQL: String literals duplication',
  'plsql:SelectStarCheck': 'SQL: SELECT * usage'
};

let mdContent = `# תוכנית תיעדוף פתרון בעיות SonarQube

**תאריך:** ${new Date().toLocaleDateString('he-IL')}
**סריקה מ-SonarCloud:** https://sonarcloud.io

---

## סיכום מצב

### סטטיסטיקה כללית

- **סה"כ בעיות:** ${summary.combined.total}
- **BLOCKER:** ${summary.combined.bySeverity.BLOCKER} ✅
- **CRITICAL:** ${summary.combined.bySeverity.CRITICAL} ⚠️
- **MAJOR:** ${summary.combined.bySeverity.MAJOR}
- **MINOR:** ${summary.combined.bySeverity.MINOR}
- **INFO:** ${summary.combined.bySeverity.INFO}

### פילוח לפי פרויקט

#### apps/api (Backend)
- סה"כ: ${summary.api.total} בעיות
- CRITICAL: ${summary.api.bySeverity.CRITICAL}
- MAJOR: ${summary.api.bySeverity.MAJOR}
- MINOR: ${summary.api.bySeverity.MINOR}
- INFO: ${summary.api.bySeverity.INFO}

#### apps/mobile (React Native)
- סה"כ: ${summary.mobile.total} בעיות
- CRITICAL: ${summary.mobile.bySeverity.CRITICAL}
- MAJOR: ${summary.mobile.bySeverity.MAJOR}
- MINOR: ${summary.mobile.bySeverity.MINOR}
- INFO: ${summary.mobile.bySeverity.INFO}

### פילוח לפי סוג

- **CODE_SMELL:** ${summary.combined.byType.CODE_SMELL} (${((summary.combined.byType.CODE_SMELL/summary.combined.total)*100).toFixed(1)}%)
- **BUG:** ${summary.combined.byType.BUG}
- **VULNERABILITY:** ${summary.combined.byType.VULNERABILITY} 🔴
- **SECURITY_HOTSPOT:** ${summary.combined.byType.SECURITY_HOTSPOT}

---

## 📋 עדיפות 1: CRITICAL Issues (${summary.combined.bySeverity.CRITICAL})

### Top Rules - API
`;

// Get top critical rules from API
const apiCritical = apiIssues.issues.filter(i => i.severity === 'CRITICAL');
const apiCriticalByRule = {};
apiCritical.forEach(i => {
  apiCriticalByRule[i.rule] = (apiCriticalByRule[i.rule] || []);
  apiCriticalByRule[i.rule].push(i);
});

Object.entries(apiCriticalByRule)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([rule, issues]) => {
    const desc = ruleDescriptions[rule] || rule;
    mdContent += `\n#### ${rule} - ${desc}\n`;
    mdContent += `- **כמות:** ${issues.length} בעיות\n`;
    mdContent += `- **קבצים מושפעים:**\n`;
    
    const fileGroups = {};
    issues.forEach(i => {
      const file = i.component.split(':').pop();
      fileGroups[file] = (fileGroups[file] || 0) + 1;
    });
    
    Object.entries(fileGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, count]) => {
        mdContent += `  - \`${file}\` (${count})\n`;
      });
  });

mdContent += `\n### Top Rules - Mobile\n`;

const mobileCritical = mobileIssues.issues.filter(i => i.severity === 'CRITICAL');
const mobileCriticalByRule = {};
mobileCritical.forEach(i => {
  mobileCriticalByRule[i.rule] = (mobileCriticalByRule[i.rule] || []);
  mobileCriticalByRule[i.rule].push(i);
});

Object.entries(mobileCriticalByRule)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10)
  .forEach(([rule, issues]) => {
    const desc = ruleDescriptions[rule] || rule;
    mdContent += `\n#### ${rule} - ${desc}\n`;
    mdContent += `- **כמות:** ${issues.length} בעיות\n`;
    mdContent += `- **קבצים מושפעים:**\n`;
    
    const fileGroups = {};
    issues.forEach(i => {
      const file = i.component.split(':').pop();
      fileGroups[file] = (fileGroups[file] || 0) + 1;
    });
    
    Object.entries(fileGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, count]) => {
        mdContent += `  - \`${file}\` (${count})\n`;
      });
  });

mdContent += `\n---

## 📋 עדיפות 2: MAJOR Issues (${summary.combined.bySeverity.MAJOR})

### Top 10 Rules עם הכי הרבה MAJOR issues

`;

const allMajor = [...apiIssues.issues.filter(i => i.severity === 'MAJOR'), 
                  ...mobileIssues.issues.filter(i => i.severity === 'MAJOR')];
const majorByRule = {};
allMajor.forEach(i => {
  majorByRule[i.rule] = (majorByRule[i.rule] || 0) + 1;
});

Object.entries(majorByRule)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([rule, count]) => {
    const desc = ruleDescriptions[rule] || rule;
    mdContent += `- **${rule}**: ${count} בעיות - ${desc}\n`;
  });

mdContent += `\n---

## 📊 ניתוח לפי קבצים בעייתיים

### Top 10 קבצים עם הכי הרבה בעיות - API

`;

Object.entries(summary.api.byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([file, count]) => {
    mdContent += `1. \`${file}\` - ${count} בעיות\n`;
  });

mdContent += `\n### Top 10 קבצים עם הכי הרבה בעיות - Mobile\n\n`;

Object.entries(summary.mobile.byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([file, count]) => {
    mdContent += `1. \`${file}\` - ${count} בעיות\n`;
  });

mdContent += `\n---

## 🔒 בעיות אבטחה (VULNERABILITY)

${summary.api.byType.VULNERABILITY || 0} vulnerabilities ב-API

`;

const apiVulns = apiIssues.issues.filter(i => i.type === 'VULNERABILITY');
apiVulns.forEach(vuln => {
  const file = vuln.component.split(':').pop();
  mdContent += `- **${vuln.rule}** בקובץ \`${file}\` שורה ${vuln.line}\n`;
  mdContent += `  - Message: ${vuln.message}\n`;
});

mdContent += `\n---

## 📈 אסטרטגיית פתרון מומלצת

### שלב 1: בעיות אבטחה (Vulnerabilities)
**זמן משוער:** 1-2 שעות
- [ ] פתרון ${summary.combined.byType.VULNERABILITY} vulnerability
- [ ] בדיקת security hotspots

### שלב 2: CRITICAL Issues - Complexity (S3776)
**זמן משוער:** 3-5 ימים
- [ ] רפקטורינג של ${(apiCriticalByRule['typescript:S3776'] || []).length + (mobileCriticalByRule['typescript:S3776'] || []).length} פונקציות מורכבות
- גישה: פירוק לפונקציות קטנות יותר, extraction methods

### שלב 3: CRITICAL Issues - Type Safety (S7773)
**זמן משוער:** 2-3 ימים
- [ ] הוספת type annotations ל-${(summary.api.byRule['typescript:S7773'] || 0) + (summary.mobile.byRule['typescript:S7773'] || 0)} מקומות
- גישה: שימוש ב-TypeScript strict mode

### שלב 4: CRITICAL Issues - אחרים
**זמן משוער:** 2-3 ימים
- [ ] פתרון בעיות נוספות (assertions, async/await, וכו')

### שלב 5: MAJOR Issues - בסדר יורד של חשיבות
**זמן משוער:** 1-2 שבועות
1. React hooks dependencies (S7778) - ${summary.mobile.byRule['typescript:S7778'] || 0} issues
2. Template literals (S6582) - ${(summary.api.byRule['typescript:S6582'] || 0) + (summary.mobile.byRule['typescript:S6582'] || 0)} issues
3. Ternary operators (S3358) - ${(summary.api.byRule['typescript:S3358'] || 0) + (summary.mobile.byRule['typescript:S3358'] || 0)} issues

### שלב 6: MINOR + INFO
**זמן משוער:** 1 שבוע
- [ ] הסרת unused imports (${summary.mobile.byRule['typescript:S1128'] || 0} issues)
- [ ] הסרת dead stores (${(summary.api.byRule['typescript:S1854'] || 0) + (summary.mobile.byRule['typescript:S1854'] || 0)} issues)
- [ ] טיפול ב-TODO comments (${(summary.api.byRule['typescript:S1135'] || 0) + (summary.mobile.byRule['typescript:S1135'] || 0)} issues)

### שלב 7: אוטומציה
- [ ] הגדרת ESLint rules להתאמה ל-SonarQube
- [ ] הוספת pre-commit hooks
- [ ] CI/CD integration

---

## 🎯 יעדים

### טווח קצר (שבוע 1-2)
- ✅ 0 BLOCKER issues (כבר אין!)
- 🎯 0 CRITICAL issues
- 🎯 0 VULNERABILITY issues

### טווח בינוני (שבוע 3-6)
- 🎯 <50 MAJOR issues (ירידה של 80%)
- 🎯 <200 MINOR issues (ירידה של 50%)

### טווח ארוך (חודש 2-3)
- 🎯 Quality Gate: PASSED
- 🎯 <10 MAJOR issues סה"כ
- 🎯 Code coverage >70%
- 🎯 אוטומציה מלאה ב-CI/CD

---

## קישורים שימושיים

- [SonarCloud - API Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_KC-MVP-server)
- [SonarCloud - Mobile Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_MVP)
- [SonarQube TypeScript Rules](https://rules.sonarsource.com/typescript/)

---

**עדכון אחרון:** ${new Date().toISOString()}
`;

fs.writeFileSync('sonar-issues-prioritized.md', mdContent);
console.log('✅ Created sonar-issues-prioritized.md');
