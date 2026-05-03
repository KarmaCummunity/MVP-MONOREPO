/**
 * When `ROOT_ADMIN_EMAIL` is unset, knowledge contribution intake (and similar)
 * still resolves the assignee by looking up this address in `user_profiles`.
 * No outbound email is sent — DB UUID lookup only.
 */
export const KC_ROOT_ADMIN_EMAIL_FALLBACK = "karmacommunity2.0@gmail.com";
