/**
 * Web stub — callers that need tokens on web use AsyncStorage / sessionStorage.
 * These functions must not run on web; they exist only so shared modules can load.
 */
export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function setItemAsync(
  _key: string,
  _value: string,
  _options?: Record<string, unknown>
): Promise<void> {
  throw new Error('[secureStoreModule] unavailable on web');
}

export async function getItemAsync(
  _key: string,
  _options?: Record<string, unknown>
): Promise<string | null> {
  throw new Error('[secureStoreModule] unavailable on web');
}

export async function deleteItemAsync(
  _key: string,
  _options?: Record<string, unknown>
): Promise<void> {
  throw new Error('[secureStoreModule] unavailable on web');
}
