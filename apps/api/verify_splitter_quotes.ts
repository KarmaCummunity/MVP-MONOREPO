
import * as fs from 'fs';
import * as path from 'path';

// The robust splitSqlStatements implementation currently in database.init.ts
function splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let currentStatement = '';
    let i = 0;
    const len = sql.length;

    while (i < len) {
        const char = sql[i];

        // Handle single quoted strings '...'
        if (char === "'") {
            currentStatement += char;
            i++;
            while (i < len) {
                currentStatement += sql[i];
                if (sql[i] === "'") {
                    // Check for escaped quote ''
                    if (i + 1 < len && sql[i + 1] === "'") {
                        currentStatement += sql[i + 1];
                        i += 2;
                        continue;
                    }
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }

        // Handle dollar quoted strings $tag$...$tag$
        if (char === '$') {
            // Check if it's a dollar quote start
            const tagMatch = sql.substring(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
            if (tagMatch) {
                const tag = tagMatch[1];
                currentStatement += tag;
                i += tag.length;

                // Find closing tag
                const closeIndex = sql.indexOf(tag, i);
                if (closeIndex !== -1) {
                    currentStatement += sql.substring(i, closeIndex + tag.length);
                    i = closeIndex + tag.length;
                } else {
                    // Unterminated dollar quote - consume rest
                    currentStatement += sql.substring(i);
                    i = len;
                }
                continue;
            }
        }

        // Handle comments
        if (char === '-' && i + 1 < len && sql[i + 1] === '-') {
            // Line comment --
            const newlineIndex = sql.indexOf('\n', i);
            if (newlineIndex !== -1) {
                currentStatement += sql.substring(i, newlineIndex + 1);
                i = newlineIndex + 1;
            } else {
                currentStatement += sql.substring(i);
                i = len;
            }
            continue;
        }

        if (char === '/' && i + 1 < len && sql[i + 1] === '*') {
            // Block comment /* ... */
            const closeIndex = sql.indexOf('*/', i + 2);
            if (closeIndex !== -1) {
                currentStatement += sql.substring(i, closeIndex + 2);
                i = closeIndex + 2;
            } else {
                currentStatement += sql.substring(i);
                i = len;
            }
            continue;
        }

        // Handle semicolon
        if (char === ';') {
            currentStatement += char;
            if (currentStatement.trim()) {
                statements.push(currentStatement.trim());
            }
            currentStatement = '';
            i++;
            continue;
        }

        // Regular character
        currentStatement += char;
        i++;
    }

    if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
    }

    return statements;
}

const triggerSql = `
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS '
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
' language 'plpgsql';
`;

console.log('Testing splitSqlStatements on single-quoted trigger function...');
const statements = splitSqlStatements(triggerSql);
console.log(`Found ${statements.length} statements.`);
statements.forEach((stmt, idx) => {
    console.log(`Statement ${idx + 1}:`);
    console.log(stmt);
    console.log('---');
});

if (statements.length === 1 && statements[0].includes("'")) {
    console.log('✅ SUCCESS: Trigger function parsed as a single statement.');
} else {
    console.log('❌ FAILURE: Trigger function was split incorrectly.');
}
