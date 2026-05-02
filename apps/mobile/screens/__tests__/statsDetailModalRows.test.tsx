import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  optionalDisplayString,
  renderCompletedRideRow,
  renderItemDonationRow,
  renderUnknownStatRow,
} from '../Landing/modals/statsDetailModalRows';
import { landingSiteScreenStyles } from '../Landing/landingSiteScreenStyles';

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

  it('renders ride row with route text', () => {
    render(renderCompletedRideRow({ from_city: 'A', to_city: 'B', ride_date: '2020-01-02' }, 0, 'en', rowStyles));
    expect(screen.getByText(/A.*B/)).toBeTruthy();
  });

  it('renders item row title', () => {
    render(renderItemDonationRow({ title: 'Chair', created_at: '2020-01-01' }, 0, 'en', rowStyles));
    expect(screen.getByText('Chair')).toBeTruthy();
  });

  it('renders unknown row with label', () => {
    render(renderUnknownStatRow('fallback', 2, rowStyles));
    expect(screen.getByText('fallback')).toBeTruthy();
  });
});
