// Test script to verify the splitSqlStatements logic
import * as fs from 'fs';
import * as path from 'path';

function splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let i = 0;

    while (i < sql.length) {
        // Skip whitespace
        while (i < sql.length && /\s/.test(sql[i])) {
            i++;
        }

        if (i >= sql.length) break;

        const start = i;

        // Check if we're starting a DO $$ block
        const remaining = sql.substring(i);
        const doMatch = remaining.match(/^DO\s+\$\$/i);

        if (doMatch) {
            // Found DO $$ - now find the matching END$$; or $$;
            i += doMatch[0].length; // Move past "DO $$"

            // Look for END$$; or $$; (the closing)
            // First try to find END$$; (more common pattern)
            let endPattern = /END\s*\$\$\s*;/gi;
            endPattern.lastIndex = i;
            let match = endPattern.exec(sql);

            let foundEnd = false;
            let endPos = -1;

            if (match) {
                // Found END$$;
                endPos = match.index + match[0].length;
                foundEnd = true;
            } else {
                // Try to find just $$; (less common but possible)
                while (i < sql.length) {
                    const dollarIndex = sql.indexOf('$$', i);
                    if (dollarIndex === -1) {
                        break; // No closing found
                    }

                    // Check what comes after $$
                    const afterDollar = sql.substring(dollarIndex + 2);
                    const trimmed = afterDollar.trimStart();

                    // Check if it's followed by semicolon (and not END before it)
                    const beforeDollar = sql.substring(Math.max(0, dollarIndex - 10), dollarIndex).trim();
                    if (trimmed.startsWith(';') && !beforeDollar.endsWith('END')) {
                        // Found the end! Calculate exact position
                        const semicolonOffset = afterDollar.indexOf(';');
                        endPos = dollarIndex + 2 + semicolonOffset + 1;
                        foundEnd = true;
                        break;
                    }

                    // Not the end, continue searching after this $$
                    i = dollarIndex + 2;
                }
            }

            if (foundEnd && endPos > start) {
                statements.push(sql.substring(start, endPos).trim());
                i = endPos;
            } else {
                // No proper end found - take the rest (shouldn't happen with valid SQL)
                statements.push(sql.substring(start).trim());
                break;
            }
        } else {
            // Regular statement - find next semicolon
            const nextSemicolon = sql.indexOf(';', i);
            if (nextSemicolon === -1) {
                // No more semicolons
                const rest = sql.substring(i).trim();
                if (rest) {
                    statements.push(rest);
                }
                break;
            }

            statements.push(sql.substring(i, nextSemicolon + 1).trim());
            i = nextSemicolon + 1;
        }
    }

    return statements.filter(stmt => stmt.length > 0);
}

// Read the schema.sql file
const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

console.log('Testing splitSqlStatements on schema.sql...\n');

const statements = splitSqlStatements(schemaSql);

console.log(`Total statements: ${statements.length}\n`);

// Find the DO $$ blocks
const doBlocks = statements.filter(stmt => stmt.startsWith('DO $$'));

console.log(`DO $$ blocks found: ${doBlocks.length}\n`);

doBlocks.forEach((block, index) => {
    console.log(`\n=== DO Block ${index + 1} ===`);
    console.log(`Length: ${block.length} characters`);
    console.log(`First 200 chars: ${block.substring(0, 200)}`);
    console.log(`Last 100 chars: ${block.substring(Math.max(0, block.length - 100))}`);

    // Check if it's properly terminated
    if (block.includes('END$$')) {
        console.log('✅ Properly terminated with END$$');
    } else if (block.endsWith('$$;')) {
        console.log('✅ Properly terminated with $$;');
    } else {
        console.log('❌ NOT properly terminated!');
        console.log('Full block:');
        console.log(block);
    }
});
