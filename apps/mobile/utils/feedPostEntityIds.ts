/** UUID v4 pattern for post-linked entity ids (tasks, rides, items, donations). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

export function isLegacyTimestampItemId(id: string | undefined): boolean {
  return !!id && /^\d{10,13}$/.test(id);
}

/** Item id from API / mapping; legacy posts used millis as id. */
export function isValidDedicatedItemId(id: string | undefined): boolean {
  return !!id && !isLegacyTimestampItemId(id) && id.length > 0;
}

/** Closed tab uses `donation_<uuid>` when the row is not a linked post. */
export function donationIdFromSyntheticFeedId(feedId: string | undefined): string | undefined {
  if (!feedId?.startsWith('donation_')) {
    return undefined;
  }
  const rest = feedId.slice('donation_'.length);
  return isUuid(rest) ? rest : undefined;
}
