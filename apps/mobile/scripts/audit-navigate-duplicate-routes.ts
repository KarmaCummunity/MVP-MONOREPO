/**
 * Advisory audit: counts `.navigate('RouteName')` usages for screens that may be registered
 * on both MainNavigator and nested tab stacks (SRS §4.4 / navigation hardening plan).
 *
 * Always exits 0. English-only stdout for CI logs.
 *
 * Usage (from apps/mobile):
 *   TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}' npx ts-node scripts/audit-navigate-duplicate-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const EXT = ['.ts', '.tsx'];

/** Routes called out in the navigation hardening plan as duplicated across root + tabs. */
const MONITORED_ROUTE_NAMES = new Set([
  'SettingsScreen',
  'ChatListScreen',
  'ChatDetailScreen',
  'NewChatScreen',
  'NotificationsScreen',
  'LandingSiteScreen',
  'UserProfileScreen',
]);

function walk(dir: string, acc: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.expo' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (EXT.some((e) => ent.name.endsWith(e))) acc.push(p);
  }
  return acc;
}

const NAVIGATE_PATTERN = /\.navigate\s*\(\s*['"](\w+)['"]/g;

function main(): void {
  const files = walk(ROOT);
  const hitsByRoute = new Map<string, Array<{ file: string; line: number }>>();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m: RegExpExecArray | null;
      const re = new RegExp(NAVIGATE_PATTERN.source, 'g');
      while ((m = re.exec(line)) !== null) {
        const name = m[1];
        if (!MONITORED_ROUTE_NAMES.has(name)) continue;
        const rel = path.relative(ROOT, file);
        if (!hitsByRoute.has(name)) hitsByRoute.set(name, []);
        hitsByRoute.get(name)!.push({ file: rel, line: i + 1 });
      }
    }
  }

  /* eslint-disable no-console — CLI script */
  console.log('nav: duplicate-route audit (advisory only)');
  console.log('Monitored routes:', [...MONITORED_ROUTE_NAMES].sort().join(', '));
  let total = 0;
  for (const name of [...MONITORED_ROUTE_NAMES].sort()) {
    const hits = hitsByRoute.get(name) ?? [];
    total += hits.length;
    console.log(`${name}: ${hits.length} reference(s)`);
    for (const h of hits.slice(0, 20)) {
      console.log(`  - ${h.file}:${h.line}`);
    }
    if (hits.length > 20) {
      console.log(`  ... ${hits.length - 20} more`);
    }
  }
  console.log(`Total monitored navigate() string references: ${total}`);
}

main();
