import type { FeedItem } from '../types/feed';

const PRODUCTION_WEB_ORIGIN = 'https://karma-community-kc.com';

/**
 * Public web origin for share links (not the API host).
 * On web, uses the current origin unless localhost (then production).
 * Optional override: EXPO_PUBLIC_WEB_APP_ORIGIN.
 */
export function getPublicWebAppOrigin(): string {
    const fromEnv =
        typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_APP_ORIGIN
            ? String(process.env.EXPO_PUBLIC_WEB_APP_ORIGIN).trim()
            : '';
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
        return fromEnv.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        const h = window.location.hostname || '';
        if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') {
            return PRODUCTION_WEB_ORIGIN;
        }
        return window.location.origin.replace(/\/$/, '');
    }
    return PRODUCTION_WEB_ORIGIN;
}

/** Deep link / web URL that opens post detail (post is loaded by id; no initialItem in query). */
export function buildPostDetailShareUrl(postId: string): string {
    const origin = getPublicWebAppOrigin();
    return `${origin}/PostDetailScreen?postId=${encodeURIComponent(postId)}`;
}

/**
 * i18n key under `postDetail:share.message.*` for the share intro line (language-specific).
 */
export function getPostShareMessageKey(item: FeedItem): string {
    const raw = (item.subtype || item.type || 'post').toString().toLowerCase();
    const status = (item.status || '').toLowerCase();

    if (raw === 'task_assignment' || (item.type === 'task_post' && raw === 'task_assignment')) {
        return 'postDetail:share.message.taskOpened';
    }
    if (raw === 'task_completion' || item.type === 'task_post') {
        return 'postDetail:share.message.taskCompleted';
    }

    if (raw === 'ride' || raw === 'ride_offered') {
        if (status === 'completed') {
            return 'postDetail:share.message.rideCompleted';
        }
        if (item.intent === 'request') {
            return 'postDetail:share.message.rideRequest';
        }
        return 'postDetail:share.message.rideOffered';
    }

    if (raw === 'item' || raw === 'donation') {
        if (item.intent === 'request') {
            return 'postDetail:share.message.itemRequest';
        }
        if (status === 'delivered' || status === 'closed' || status === 'completed') {
            return 'postDetail:share.message.itemDelivered';
        }
        return 'postDetail:share.message.itemGive';
    }

    if (raw === 'community_challenge') {
        return 'postDetail:share.message.challenge';
    }

    return 'postDetail:share.message.generic';
}
