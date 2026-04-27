/**
 * Extract a string user id from JWT/session payload for SQL parameters and logs.
 * Avoids coercing objects to "[object Object]" in template strings.
 */
export function sessionUserIdString(reqUser: unknown): string | undefined {
  if (reqUser === null || reqUser === undefined) {
    return undefined;
  }
  const o = reqUser as Record<string, unknown>;
  for (const key of ["userId", "id", "sub"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.length > 0) {
      return v;
    }
  }
  return undefined;
}
