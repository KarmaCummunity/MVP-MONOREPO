// File overview:
// - Purpose: Branded type and runtime guard for the canonical user identifier.
// - Reached from: AuthSessionService and any boundary that must enforce UUID identity.
// - SSoT: `user_profiles.id` (Postgres UUID column) is the only legal canonical user id in the app.

/**
 * Canonical user profile UUID (matches `user_profiles.id` on the server).
 * Use the `UserProfileId` brand at boundaries where a non-UUID value would be a bug.
 */
export type UserProfileId = string & { readonly __brand: 'UserProfileId' };

/**
 * Permissive UUID guard. Accepts any 8-4-4-4-12 hex layout that Postgres' `uuid` column will
 * accept. We intentionally do NOT restrict by version (`[1-5]`) or variant (`[89ab]`) bits —
 * Postgres accepts every well-formed UUID (including v6/v7 and the nil UUID), and rejecting them
 * client-side would brick login for any user whose row was generated with a non-v4 UUID.
 *
 * Firebase UIDs (28-char alphanumeric, no dashes) and Google `sub` values (digits only) do NOT
 * match this format and will return false.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Type guard: returns true if `value` is a canonical user profile UUID string.
 */
export function isCanonicalUserProfileUuid(
  value: unknown,
): value is UserProfileId {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Asserts and brands the value as a `UserProfileId`. Throws if invalid.
 */
export function asUserProfileId(value: unknown): UserProfileId {
  if (!isCanonicalUserProfileUuid(value)) {
    throw new Error(
      `[SSoT] Expected canonical user_profiles.id (UUID), got: ${typeof value === 'string' ? value : typeof value}`,
    );
  }
  return value;
}
