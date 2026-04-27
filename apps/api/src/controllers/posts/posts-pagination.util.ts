/** Parse positive int query args; Sonar prefers Number.parseInt over global parseInt. */
export function parseLimitOffset(
  limitArg: string,
  offsetArg: string,
  defaults: { limit: number; offset: number },
): { limit: number; offset: number } {
  const limitRaw = Number.parseInt(limitArg, 10);
  const offsetRaw = Number.parseInt(offsetArg, 10);
  return {
    limit:
      Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : defaults.limit,
    offset:
      Number.isFinite(offsetRaw) && offsetRaw >= 0
        ? offsetRaw
        : defaults.offset,
  };
}

export function parseLimit(limitArg: string, defaultLimit: number): number {
  const n = Number.parseInt(limitArg, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultLimit;
}

export function parseCountTotal(value: string | number | undefined): number {
  const s = value === undefined || value === null ? "0" : String(value);
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}
