import { donationActivityTitle } from '../profileDonationActivityTitle';

describe('donationActivityTitle', () => {
  it('formats money donations', () => {
    expect(donationActivityTitle({ type: 'money', amount: 42 })).toBe('תרומה: 42 ₪');
  });

  it('formats time donations', () => {
    expect(donationActivityTitle({ type: 'time', title: 'Garden help' })).toBe('התנדבות: Garden help');
  });

  it('formats trump donations', () => {
    expect(donationActivityTitle({ type: 'trump', title: 'To TLV' })).toBe('טרמפ: To TLV');
  });

  it('falls back for unknown types', () => {
    expect(donationActivityTitle({ type: 'other', title: 'Gift' })).toBe('Gift');
    expect(donationActivityTitle({})).toBe('תרומה חדשה');
  });
});
