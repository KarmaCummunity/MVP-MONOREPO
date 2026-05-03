import { mapCommunityChallengeFeedFields } from '../mapCommunityChallengeFeedFields';

describe('mapCommunityChallengeFeedFields', () => {
    it('returns empty for non-challenge posts', () => {
        expect(
            mapCommunityChallengeFeedFields({
                post_type: 'item',
                images: ['https://x/img.jpg'],
            }),
        ).toEqual({ thumbnail: null });
    });

    it('merges joined row and metadata and prefers challenge image for thumbnail', () => {
        const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const out = mapCommunityChallengeFeedFields({
            post_type: 'community_challenge',
            community_challenge_id: id,
            community_challenge: {
                id,
                type: 'NUMERIC',
                frequency: 'DAILY',
                difficulty: 'medium',
                category: 'health',
                goal_value: 100,
                image_url: 'https://cdn/challenge.jpg',
            },
            metadata: JSON.stringify({
                challenge_id: id,
                type: 'BOOLEAN',
                category: 'ignored_when_joined',
            }),
            images: ['https://post/cover.jpg'],
        });
        expect(out.challengeId).toBe(id);
        expect(out.thumbnail).toBe('https://cdn/challenge.jpg');
        expect(out.challengeData?.type).toBe('NUMERIC');
        expect(out.challengeData?.frequency).toBe('DAILY');
    });

    it('falls back to post images when challenge has no image_url', () => {
        const out = mapCommunityChallengeFeedFields({
            post_type: 'community_challenge',
            community_challenge: { id: 'x', type: 'BOOLEAN', frequency: 'DAILY' },
            images: ['https://post/only.jpg'],
        });
        expect(out.thumbnail).toBe('https://post/only.jpg');
    });
});
