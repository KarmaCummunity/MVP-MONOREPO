import Constants from "expo-constants";

/**
 * Fallback when `EXPO_PUBLIC_ADMIN_EMAILS` is unset — aligned with API
 * `ROOT_ADMIN_EMAIL` / `KC_ROOT_ADMIN_EMAIL_FALLBACK` (`apps/api/src/config/kc-root-admin.defaults.ts`).
 */
const KC_ORGANIZATION_ROOT_EMAIL_FALLBACK = "karmacommunity2.0@gmail.com";

function readExpoPublicAdminEmailsRaw(): string {
  try {
    const extra = Constants.expoConfig?.extra as
      | { EXPO_PUBLIC_ADMIN_EMAILS?: string }
      | undefined;
    const fromExtra = extra?.EXPO_PUBLIC_ADMIN_EMAILS?.trim();
    if (fromExtra) {
      return fromExtra;
    }
  } catch {
    // Constants may be unavailable in some test or tooling contexts
  }
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_ADMIN_EMAILS?.trim()) {
    return process.env.EXPO_PUBLIC_ADMIN_EMAILS.trim();
  }
  return "";
}

/**
 * Organization root identity for contact links and protected admin UI.
 * Uses the first entry of `EXPO_PUBLIC_ADMIN_EMAILS` (comma-separated) when set, else the API fallback.
 */
function resolveOrganizationRootEmail(): string {
  const raw = readExpoPublicAdminEmailsRaw();
  if (raw) {
    const first = raw.split(",")[0]?.trim().toLowerCase();
    if (first) {
      return first;
    }
  }
  return KC_ORGANIZATION_ROOT_EMAIL_FALLBACK.toLowerCase();
}

export const KC_ORGANIZATION_ROOT_EMAIL = resolveOrganizationRootEmail();

export function isOrganizationRootEmail(
  email: string | null | undefined,
): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return email.trim().toLowerCase() === KC_ORGANIZATION_ROOT_EMAIL;
}
