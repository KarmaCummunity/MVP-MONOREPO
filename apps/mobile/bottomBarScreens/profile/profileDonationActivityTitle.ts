/** Builds the activity title line for a donation row on the profile recent-activity list. */
export function donationActivityTitle(donation: Readonly<{ type?: string; amount?: number; title?: string }>): string {
  if (donation.type === 'money') {
    return `תרומה: ${donation.amount || 0} ₪`;
  }
  if (donation.type === 'time') {
    return `התנדבות: ${donation.title || ''}`;
  }
  if (donation.type === 'trump') {
    return `טרמפ: ${donation.title || ''}`;
  }
  return donation.title || 'תרומה חדשה';
}
