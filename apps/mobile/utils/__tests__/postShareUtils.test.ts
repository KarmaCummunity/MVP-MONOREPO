import {
    buildPostDetailShareUrl,
    getPostShareMessageKey,
    getPublicWebAppOrigin,
} from '../postShareUtils';
import type { FeedItem } from '../../types/feed';

const baseItem = (overrides: Partial<FeedItem>): FeedItem =>
    ({
        id: 'p1',
        type: 'post',
        title: 't',
        description: '',
        thumbnail: null,
        timestamp: new Date().toISOString(),
        user: { id: 'u1', name: 'U' },
        likes: 0,
        comments: 0,
        isLiked: false,
        ...overrides,
    }) as FeedItem;

describe('getPublicWebAppOrigin', () => {
    const prev = process.env.EXPO_PUBLIC_WEB_APP_ORIGIN;

    afterEach(() => {
        if (prev === undefined) {
            delete process.env.EXPO_PUBLIC_WEB_APP_ORIGIN;
        } else {
            process.env.EXPO_PUBLIC_WEB_APP_ORIGIN = prev;
        }
    });

    it('uses EXPO_PUBLIC_WEB_APP_ORIGIN when set', () => {
        process.env.EXPO_PUBLIC_WEB_APP_ORIGIN = 'https://custom.example.com/';
        expect(getPublicWebAppOrigin()).toBe('https://custom.example.com');
    });
});

describe('buildPostDetailShareUrl', () => {
    const prev = process.env.EXPO_PUBLIC_WEB_APP_ORIGIN;

    beforeEach(() => {
        process.env.EXPO_PUBLIC_WEB_APP_ORIGIN = 'https://example.com';
    });

    afterEach(() => {
        if (prev === undefined) {
            delete process.env.EXPO_PUBLIC_WEB_APP_ORIGIN;
        } else {
            process.env.EXPO_PUBLIC_WEB_APP_ORIGIN = prev;
        }
    });

    it('encodes postId and uses PostDetailScreen path', () => {
        expect(buildPostDetailShareUrl('abc/def')).toBe(
            'https://example.com/PostDetailScreen?postId=abc%2Fdef',
        );
    });
});

describe('getPostShareMessageKey', () => {
    it('maps task assignment', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'task_assignment', type: 'task_post' }))).toBe(
            'postDetail:share.message.taskOpened',
        );
    });

    it('maps task completion', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'task_completion', type: 'task_post' }))).toBe(
            'postDetail:share.message.taskCompleted',
        );
    });

    it('maps ride completed', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'ride', status: 'completed' }))).toBe(
            'postDetail:share.message.rideCompleted',
        );
    });

    it('maps ride request intent', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'ride', intent: 'request' }))).toBe(
            'postDetail:share.message.rideRequest',
        );
    });

    it('maps item give vs request vs delivered', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'donation', intent: 'give' }))).toBe(
            'postDetail:share.message.itemGive',
        );
        expect(getPostShareMessageKey(baseItem({ subtype: 'item', intent: 'request' }))).toBe(
            'postDetail:share.message.itemRequest',
        );
        expect(getPostShareMessageKey(baseItem({ subtype: 'item', intent: 'give', status: 'delivered' }))).toBe(
            'postDetail:share.message.itemDelivered',
        );
    });

    it('maps community challenge', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'community_challenge' }))).toBe(
            'postDetail:share.message.challenge',
        );
    });

    it('falls back to generic', () => {
        expect(getPostShareMessageKey(baseItem({ subtype: 'post' }))).toBe('postDetail:share.message.generic');
    });
});
