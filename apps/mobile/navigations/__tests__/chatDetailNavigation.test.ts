import { normalizeChatDetailParams } from '../chatDetailNavigation';

describe('chatDetailNavigation', () => {
  describe('normalizeChatDetailParams', () => {
    it('prefers conversationId over chatId', () => {
      expect(
        normalizeChatDetailParams({
          conversationId: 'a',
          chatId: 'b',
        }),
      ).toEqual(
        expect.objectContaining({ conversationId: 'a' }),
      );
    });

    it('maps legacy chatId when conversationId absent', () => {
      expect(normalizeChatDetailParams({ chatId: 'legacy-1' })).toEqual(
        expect.objectContaining({ conversationId: 'legacy-1' }),
      );
    });

    it('returns null when no id present', () => {
      expect(normalizeChatDetailParams({ userName: 'x' })).toBeNull();
    });

    it('trims whitespace on ids', () => {
      expect(normalizeChatDetailParams({ conversationId: '  trim-me  ' })).toEqual(
        expect.objectContaining({ conversationId: 'trim-me' }),
      );
    });
  });
});
