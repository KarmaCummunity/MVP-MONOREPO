/**
 * URL validation utilities.
 * Centralises safe-URL checks so that user-controlled URLs are always validated
 * before being used as Image sources or in Linking.openURL().
 */

/** Allowed schemes for safe external links (http only in dev builds). */
const ALLOWED_SCHEMES_RELEASE = ['https:'];
const ALLOWED_SCHEMES_DEV = ['https:', 'http:'];

/** Allowed schemes for image sources; remote http only in dev builds. */
const ALLOWED_IMAGE_SCHEMES_REMOTE_RELEASE = ['https:'];
const ALLOWED_IMAGE_SCHEMES_REMOTE_DEV = ['https:', 'http:'];
const ALLOWED_IMAGE_LOCAL_SCHEMES = ['file:', 'data:', 'blob:'];

function allowInsecureHttp(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function remoteImageSchemes(): readonly string[] {
  return allowInsecureHttp()
    ? ALLOWED_IMAGE_SCHEMES_REMOTE_DEV
    : ALLOWED_IMAGE_SCHEMES_REMOTE_RELEASE;
}

function externalLinkSchemes(): readonly string[] {
  return allowInsecureHttp()
    ? ALLOWED_SCHEMES_DEV
    : ALLOWED_SCHEMES_RELEASE;
}

/**
 * Prefer https for persisted/opened links in release builds (cleartext HTTP hotspot mitigation).
 */
export function preferHttpsUrl(url: string): string {
  const trimmed = url.trim();
  if (allowInsecureHttp()) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

/**
 * Returns true when the URL is safe to use as an Image source URI.
 * Accepts https (release), http only in dev, plus file/data/blob. Falls back to false on parse errors.
 */
export function isSafeImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  const lowerUrl = url.toLowerCase().trim();
  const remote = remoteImageSchemes();
  if (remote.some((scheme) => lowerUrl.startsWith(scheme))) {
    return true;
  }
  if (ALLOWED_IMAGE_LOCAL_SCHEMES.some((scheme) => lowerUrl.startsWith(scheme))) {
    return true;
  }

  try {
    const parsed = new URL(url);
    if (ALLOWED_IMAGE_LOCAL_SCHEMES.includes(parsed.protocol)) {
      return true;
    }
    return remote.includes(parsed.protocol);
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
 * Release builds allow https only; dev builds also allow http (e.g. local tooling).
 */
export function isSafeExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return externalLinkSchemes().includes(parsed.protocol);
  } catch {
    return false;
  }
}
