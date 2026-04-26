import {
  mapKnowledgeCommunityLinkApiError,
  mapKnowledgeContributionApiError,
} from '../knowledgeDonationApiMessages';

describe('mapKnowledgeCommunityLinkApiError', () => {
  it('maps invalid url', () => {
    expect(mapKnowledgeCommunityLinkApiError('invalid url')).toBe('הקישור אינו תקין');
  });
  it('maps network error', () => {
    expect(mapKnowledgeCommunityLinkApiError('Network error - please check your connection')).toBe(
      'שגיאת רשת — בדקו את החיבור לאינטרנט',
    );
  });
  it('returns fallback when empty', () => {
    expect(mapKnowledgeCommunityLinkApiError(undefined)).toBe('שמירת הקישור נכשלה');
  });
});

describe('mapKnowledgeContributionApiError', () => {
  it('maps ROOT_ADMIN configuration', () => {
    expect(
      mapKnowledgeContributionApiError(
        'Server is not configured to receive knowledge requests (missing ROOT_ADMIN_EMAIL)',
      ),
    ).toMatch(/מנהל המערכת/);
  });
  it('maps message too long', () => {
    expect(mapKnowledgeContributionApiError('Message too long (max 4000 characters)')).toBe(
      'ההודעה ארוכה מדי (עד 4000 תווים)',
    );
  });
  it('returns fallback when empty', () => {
    expect(mapKnowledgeContributionApiError('')).toBe('לא ניתן לשלוח את הבקשה כרגע');
  });
});
