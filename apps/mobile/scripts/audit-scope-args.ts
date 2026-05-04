/**
 * Helpers for scoped (changed-files-only) mobile audits used by CI and audit-all.ts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const MOBILE_REPO_PREFIX = 'apps/mobile/';

export interface ScopedPathPredicates {
  isAuditableFile: (absPath: string) => boolean;
  shouldExcludeRelativeToRoot: (relativePosix: string) => boolean;
}

/**
 * Normalize lines from git diff / CI into paths relative to the mobile app root (posix).
 * Drops paths outside apps/mobile when they use the monorepo prefix.
 */
export function normalizePathsRelativeToMobileRoot(lines: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of lines) {
    let line = raw.trim().replaceAll('\\', '/');
    if (!line) {
      continue;
    }
    if (line.startsWith('apps/') && !line.startsWith(MOBILE_REPO_PREFIX)) {
      continue;
    }
    if (line.startsWith(MOBILE_REPO_PREFIX)) {
      line = line.slice(MOBILE_REPO_PREFIX.length);
    }
    line = line.replace(/^\/+/, '');
    if (line.includes('..')) {
      continue;
    }
    if (!/\.(tsx?)$/i.test(line)) {
      continue;
    }
    out.add(line);
  }
  return [...out];
}

/**
 * Read a path list: one path per line. Use `-` for stdin.
 */
export function readPathList(filePathOrDash: string): string[] {
  const buf =
    filePathOrDash === '-'
      ? fs.readFileSync(0, 'utf-8')
      : fs.readFileSync(filePathOrDash, 'utf-8');
  return buf.split(/\r?\n/);
}

export function parseFilesFromFlag(argv: readonly string[]): string | null {
  for (const a of argv) {
    if (a.startsWith('--files-from=')) {
      const value = a.slice('--files-from='.length);
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

function isPathUnderRoot(rootResolved: string, candidateAbs: string): boolean {
  const rootWithSep = rootResolved.endsWith(path.sep) ? rootResolved : `${rootResolved}${path.sep}`;
  const resolved = path.resolve(candidateAbs);
  return resolved === rootResolved || resolved.startsWith(rootWithSep);
}

/**
 * Resolve user-supplied relative paths to absolute paths under rootDir that exist and pass predicates.
 */
export function resolveScopedAbsolutePaths(
  rootDir: string,
  relativePaths: ReadonlySet<string>,
  predicates: ScopedPathPredicates
): string[] {
  const rootResolved = path.resolve(rootDir);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const relInput of relativePaths) {
    const relPosix = relInput.replaceAll('\\', '/').replace(/^\/+/, '');
    if (relPosix.includes('..')) {
      continue;
    }
    const abs = path.resolve(rootDir, relPosix);
    if (!isPathUnderRoot(rootResolved, abs)) {
      continue;
    }
    if (!fs.existsSync(abs)) {
      continue;
    }
    const relFromRoot = path.relative(rootDir, abs).replaceAll('\\', '/');
    if (relFromRoot.startsWith('..')) {
      continue;
    }
    if (!predicates.isAuditableFile(abs)) {
      continue;
    }
    if (predicates.shouldExcludeRelativeToRoot(relFromRoot)) {
      continue;
    }

    if (!seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
}
