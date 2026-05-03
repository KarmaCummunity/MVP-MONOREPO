jest.mock('../../utils/chatService', () => ({
  getAllConversations: jest.fn(),
  createConversation: jest.fn(),
  conversationExists: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock('../../utils/followService', () => ({
  getFollowing: jest.fn(),
  getFollowers: jest.fn(),
  getFollowSuggestions: jest.fn(),
}));

jest.mock('../../utils/loggerService', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import type { UserPreview as CharacterType } from '../../globals/types';
import {
  applyNewChatFriendFilters,
  computeWebMaxListHeight,
  isFriendCurrentUser,
} from '../newChatScreenHelpers';

function friend(partial: Partial<CharacterType> & Pick<CharacterType, 'id'>): CharacterType {
  return {
    name: 'Friend',
    ...partial,
  } as CharacterType;
}

describe('newChatScreenHelpers', () => {
  describe('computeWebMaxListHeight', () => {
    it('returns undefined when not web', () => {
      expect(computeWebMaxListHeight('ios', 800, 49, 60, false, 0)).toBeUndefined();
    });

    it('returns undefined when screen height missing', () => {
      expect(computeWebMaxListHeight('web', undefined, 49, 60, false, 0)).toBeUndefined();
    });

    it('returns undefined when header height not measured', () => {
      expect(computeWebMaxListHeight('web', 800, 49, 0, false, 0)).toBeUndefined();
    });

    it('subtracts tab bar, header, and optional filters', () => {
      expect(computeWebMaxListHeight('web', 1000, 49, 60, false, 80)).toBe(891);
      expect(computeWebMaxListHeight('web', 1000, 49, 60, true, 80)).toBe(811);
    });
  });

  describe('isFriendCurrentUser', () => {
    const selId = 'abc';
    const selEmail = 'me@test.com';

    it('matches same id', () => {
      expect(isFriendCurrentUser(friend({ id: 'ABC', email: 'x@y.com' }), selId, selEmail)).toBe(true);
    });

    it('matches same email when ids differ', () => {
      expect(isFriendCurrentUser(friend({ id: 'other', email: 'Me@Test.COM' }), selId, selEmail)).toBe(true);
    });

    it('treats empty friend id as current user', () => {
      expect(isFriendCurrentUser(friend({ id: '', email: '' }), selId, selEmail)).toBe(true);
    });

    it('returns false for distinct user', () => {
      expect(isFriendCurrentUser(friend({ id: 'z', email: 'z@test.com' }), selId, selEmail)).toBe(false);
    });
  });

  describe('applyNewChatFriendFilters', () => {
    const selectedUser = { id: 'me', email: 'me@test.com' };

    it('returns list unchanged when no selected user', () => {
      const list = [friend({ id: 'a' })];
      expect(applyNewChatFriendFilters(list, null, 'all', 'name', '')).toEqual(list);
    });

    it('filters by search query', () => {
      const list = [friend({ id: 'a', name: 'Alice' }), friend({ id: 'b', name: 'Bob' })];
      const out = applyNewChatFriendFilters(list, selectedUser, 'all', 'name', 'bob');
      expect(out.map(f => f.id)).toEqual(['b']);
    });

    it('applies online filter', () => {
      const list = [
        friend({ id: 'a', isActive: true }),
        friend({ id: 'b', isActive: false }),
      ];
      const out = applyNewChatFriendFilters(list, selectedUser, 'online', 'name', '');
      expect(out.map(f => f.id)).toEqual(['a']);
    });
  });
});
