// File overview:
// - Purpose: Branded type and runtime guard for the canonical user identifier.
// - Reached from: AuthSessionService and any boundary that must enforce UUID identity.
// - SSoT: `user_profiles.id` (UUID v1-v5) is the only legal canonical user id in the app.

/**
 * Canonical user profile UUID (matches `user_profiles.id` on the server).
 * Use the `UserProfileId` brand at boundaries where a non-UUID value would be a bug.
 */
export type UserProfileId = string & { readonly __brand: 'UserProfileId' };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Type guard: returns true if `value` is a canonical user profile UUID string.
 *
 * NOTE: Firebase UIDs and Google `sub` values do NOT match this format and will return false.
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
