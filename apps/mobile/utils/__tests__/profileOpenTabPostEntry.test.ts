import { classifyOpenProfilePost } from '../profileOpenTabPostEntry';

describe('classifyOpenProfilePost', () => {
    it('classifies community challenge as post without redundant overrides', () => {
        const row = classifyOpenProfilePost({ post_type: 'community_challenge' });
        expect(row).toEqual({
            shouldInclude: true,
            status: 'active',
            type: 'post',
        });
    });

    it('classifies task posts', () => {
        expect(
            classifyOpenProfilePost({
                post_type: 'task_assignment',
                task: { status: 'open' },
            }),
        ).toEqual({ shouldInclude: true, status: 'open', type: 'task' });
    });
});
