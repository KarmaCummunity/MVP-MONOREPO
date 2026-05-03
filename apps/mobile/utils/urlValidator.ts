/**
 * URL validation utilities.
 * Centralises safe-URL checks so that user-controlled URLs are always validated
 * before being used as Image sources or in Linking.openURL().
 */

/** Allowed schemes for safe external links. */
const ALLOWED_SCHEMES = ['https:', 'http:'];

/** Allowed schemes for image sources (must be HTTPS in production). */
const ALLOWED_IMAGE_SCHEMES = ['https:', 'http:', 'file:', 'data:', 'blob:'];

/**
 * Returns true when the URL is safe to use as an Image source URI.
 * Accepts only http/https URLs. Falls back to false on any parsing error.
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Fast check for allowed schemes (more robust for some React Native environments)
  const lowerUrl = url.toLowerCase().trim();
  if (ALLOWED_IMAGE_SCHEMES.some(scheme => lowerUrl.startsWith(scheme))) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitises a user-controlled avatar URL.
 * Returns the URL if it is a safe http/https URL, otherwise returns null
 * so callers can fall back to a local default asset.
 */
export function sanitiseAvatarUrl(url: string | null | undefined): string | null {
  return isSafeImageUrl(url) ? (url as string) : null;
}

/**
 * Returns true when the URL is safe to pass to Linking.openURL().
 * Only http and https URLs are allowed.
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}
