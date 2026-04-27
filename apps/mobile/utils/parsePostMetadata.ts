/** Parses posts.metadata from API (string JSON or object). */
export function parsePostMetadata(metadata: unknown): Record<string, unknown> | null {
    if (metadata == null) {
        return null;
    }
    if (typeof metadata === 'string') {
        try {
            const parsed: unknown = JSON.parse(metadata);
            return typeof parsed === 'object' && parsed !== null
                ? (parsed as Record<string, unknown>)
                : null;
        } catch {
            return null;
        }
    }
    if (typeof metadata === 'object') {
        return metadata as Record<string, unknown>;
    }
    return null;
}
