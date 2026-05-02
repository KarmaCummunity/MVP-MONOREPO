import type { ChallengeFeedData } from '../types/feed';
import { parsePostMetadata } from './parsePostMetadata';

/**
 * Maps API user-post / feed post row for `post_type === 'community_challenge'`
 * into challenge snapshot + thumbnail (challenge image_url preferred).
 */
export function mapCommunityChallengeFeedFields(post: {
    post_type?: string;
    metadata?: unknown;
    community_challenge_id?: string;
    community_challenge?: ChallengeFeedData | null;
    images?: string[] | null;
}): {
    challengeData?: ChallengeFeedData;
    challengeId?: string;
    thumbnail: string | null;
} {
    if (post.post_type !== 'community_challenge') {
        return { thumbnail: null };
    }

    const meta = parsePostMetadata(post.metadata);
    const joined = post.community_challenge;
    const metaChallengeId =
        typeof meta?.challenge_id === 'string' ? meta.challenge_id : undefined;

    const challengeData: ChallengeFeedData = {
        ...(joined && typeof joined === 'object' ? joined : {}),
        id: joined?.id || metaChallengeId,
        type: joined?.type || (typeof meta?.type === 'string' ? meta.type : undefined),
        frequency:
            joined?.frequency ||
            (typeof meta?.frequency === 'string' ? meta.frequency : undefined),
        difficulty:
            joined?.difficulty ||
            (typeof meta?.difficulty === 'string' ? meta.difficulty : undefined),
        category:
            joined?.category ??
            (typeof meta?.category === 'string' ? meta.category : null),
        goal_value:
            joined?.goal_value ??
            (typeof meta?.goal_value === 'number' || typeof meta?.goal_value === 'string'
                ? meta.goal_value
                : undefined),
        deadline:
            joined?.deadline ??
            (typeof meta?.deadline === 'string' ? meta.deadline : null),
        image_url: joined?.image_url ?? null,
    };

    const challengeId = challengeData.id || post.community_challenge_id;
    const img = challengeData.image_url;
    const thumbFromChallenge =
        img && String(img).trim() !== '' ? String(img) : null;
    const thumbFromPost =
        post.images && post.images.length > 0 ? post.images[0] : null;

    return {
        challengeData,
        challengeId,
        thumbnail: thumbFromChallenge || thumbFromPost,
    };
}
