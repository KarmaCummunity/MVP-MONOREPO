import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockGetFollowers = jest.fn();
const mockGetFollowing = jest.fn();

jest.mock('../notificationService', () => ({
  sendFollowNotification: jest.fn(),
}));

jest.mock('../databaseService', () => ({
  db: {
    getFollowers: (...args: unknown[]) => mockGetFollowers(...args),
    getFollowing: (...args: unknown[]) => mockGetFollowing(...args),
    addFollower: jest.fn(),
    addFollowing: jest.fn(),
    removeFollower: jest.fn(),
    removeFollowing: jest.fn(),
    updateUser: jest.fn(),
  },
  DatabaseService: { clearAllData: jest.fn() },
}));

import {
  followerIdFromRelation,
  followingIdFromRelation,
  getFollowStats,
  getFollowingStateForUserIds,
} from '../followService';

describe('followService relation helpers', () => {
  it('reads camelCase followerId from relation', () => {
    expect(followerIdFromRelation({ followerId: 'a' })).toBe('a');
  });

  it('reads snake_case follower_id from relation', () => {
    expect(followerIdFromRelation({ follower_id: 'b' })).toBe('b');
  });

  it('reads nested data.followerId', () => {
    expect(followerIdFromRelation({ data: { followerId: 'c' } })).toBe('c');
  });

  it('reads followingId and following_id', () => {
    expect(followingIdFromRelation({ followingId: 'x' })).toBe('x');
    expect(followingIdFromRelation({ following_id: 'y' })).toBe('y');
  });
});

describe('getFollowStats', () => {
  beforeEach(() => {
    mockGetFollowers.mockReset();
    mockGetFollowing.mockReset();
  });

  it('isFollowing when viewer is among target followers', async () => {
    mockGetFollowers.mockResolvedValue([{ followerId: 'viewer-1' }]);
    mockGetFollowing.mockResolvedValue([]);

    const stats = await getFollowStats('target', 'viewer-1');
    expect(stats.isFollowing).toBe(true);
    expect(stats.followersCount).toBe(1);
    expect(stats.followingCount).toBe(0);
  });

  it('not following when viewer is not among target followers', async () => {
    mockGetFollowers.mockResolvedValue([{ followerId: 'someone-else' }]);
    mockGetFollowing.mockResolvedValue([{ followingId: 'other' }]);

    const stats = await getFollowStats('target', 'viewer-1');
    expect(stats.isFollowing).toBe(false);
  });
});

describe('getFollowingStateForUserIds', () => {
  beforeEach(() => {
    mockGetFollowing.mockReset();
  });

  it('marks ids present in viewer following list', async () => {
    mockGetFollowing.mockResolvedValue([
      { followingId: 'u1' },
      { following_id: 'u2' },
    ]);

    const map = await getFollowingStateForUserIds('viewer', ['u1', 'u2', 'u3']);
    expect(map.u1.isFollowing).toBe(true);
    expect(map.u2.isFollowing).toBe(true);
    expect(map.u3.isFollowing).toBe(false);
  });
});
