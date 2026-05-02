/**
 * Unit tests for stats detail row helpers — avoids @testing-library/react-native so CI
 * does not require react-test-renderer resolution when mobile devDependencies are not installed.
 */
import {
  optionalDisplayString,
  renderCompletedRideRow,
  renderItemDonationRow,
  renderUnknownStatRow,
} from '../../screens/Landing/modals/statsDetailModalRows';
import { landingSiteScreenStyles } from '../../screens/Landing/landingSiteScreenStyles';

const rowStyles = {
  detailItem: landingSiteScreenStyles.detailItem,
  detailItemNumber: landingSiteScreenStyles.detailItemNumber,
  detailItemContent: landingSiteScreenStyles.detailItemContent,
  detailItemText: landingSiteScreenStyles.detailItemText,
  detailItemSubtext: landingSiteScreenStyles.detailItemSubtext,
};

describe('statsDetailModalRows', () => {
  it('optionalDisplayString reads object city without object default stringification', () => {
    expect(optionalDisplayString({ city: 'Tel Aviv' })).toBe('Tel Aviv');
    expect(optionalDisplayString({ foo: 1 })).toBeUndefined();
  });

  it('renderCompletedRideRow includes route in tree', () => {
    const el = renderCompletedRideRow(
      { from_city: 'A', to_city: 'B', ride_date: '2020-01-02' },
      0,
      'en',
      rowStyles,
    );
    const json = JSON.stringify(el);
    expect(json).toContain('A');
    expect(json).toContain('B');
  });

  it('renderItemDonationRow includes title', () => {
    const el = renderItemDonationRow({ title: 'Chair', created_at: '2020-01-01' }, 0, 'en', rowStyles);
    expect(JSON.stringify(el)).toContain('Chair');
  });

  it('renderUnknownStatRow includes label', () => {
    const el = renderUnknownStatRow('fallback', 2, rowStyles);
    expect(JSON.stringify(el)).toContain('fallback');
  });
});
