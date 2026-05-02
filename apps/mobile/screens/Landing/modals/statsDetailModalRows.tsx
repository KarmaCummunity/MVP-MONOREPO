import React from 'react';
import { Text, View } from 'react-native';
import { landingSiteScreenStyles } from '../landingSiteScreenStyles';

export type StatDetailRowStyles = Pick<
  typeof landingSiteScreenStyles,
  'detailItem' | 'detailItemNumber' | 'detailItemContent' | 'detailItemText' | 'detailItemSubtext'
>;

function dateLocale(lang: string | undefined): string | undefined {
  return lang === 'he' ? 'he-IL' : undefined;
}

function safeDate(value: unknown, lang: string | undefined): string {
  const raw = value != null ? String(value) : '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(dateLocale(lang));
}

function safeDateOnly(value: unknown, lang: string | undefined): string {
  const raw = value != null ? String(value) : '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(dateLocale(lang));
}

function rowShell(
  styles: StatDetailRowStyles,
  index: number,
  primary: string,
  lines: (string | null | undefined)[],
): React.ReactElement {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailItemNumber}>{index + 1}.</Text>
      <View style={styles.detailItemContent}>
        <Text style={styles.detailItemText}>{primary}</Text>
        {lines
          .filter((line): line is string => Boolean(line && line.trim().length > 0))
          .map((line, i) => (
            <Text key={`sub-${i}`} style={styles.detailItemSubtext}>
              {line}
            </Text>
          ))}
      </View>
    </View>
  );
}

export function renderSiteVisitRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const ua = item.user_agent;
  const uaStr = typeof ua === 'string' && ua.length > 0 ? (ua.length > 50 ? `${ua.slice(0, 50)}…` : ua) : undefined;
  return rowShell(styles, index, safeDate(item.timestamp ?? item.created_at, lang), uaStr ? [uaStr] : []);
}

export function renderTotalUserRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = String(item.name || item.email || '—');
  const lines = [
    safeDateOnly(item.join_date ?? item.created_at, lang),
    item.city != null ? String(item.city) : undefined,
  ];
  return rowShell(styles, index, title, lines);
}

export function renderMoneyDonationRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const amount = Number(item.amount ?? 0);
  const amt = Number.isFinite(amount) ? amount.toLocaleString(dateLocale(lang)) : '0';
  const title = `${String(item.donor_name || '—')} • ${amt} ₪`;
  const lines = [safeDateOnly(item.donation_date ?? item.created_at, lang), item.category_name != null ? String(item.category_name) : undefined];
  return rowShell(styles, index, title, lines);
}

export function renderItemDonationRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = String(item.title || item.item_name || '—');
  const lines = [safeDateOnly(item.created_at, lang), item.donor_name != null ? String(item.donor_name) : undefined];
  return rowShell(styles, index, title, lines);
}

export function renderCompletedRideRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = `${String(item.from_city || '—')} → ${String(item.to_city || '—')}`;
  const lines = [safeDateOnly(item.ride_date ?? item.created_at, lang), item.driver_name != null ? String(item.driver_name) : undefined];
  return rowShell(styles, index, title, lines);
}

export function renderDonorRecurringRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const amount = item.amount != null ? Number(item.amount) : null;
  const amtPart =
    amount != null && Number.isFinite(amount) ? ` • ${amount.toLocaleString(dateLocale(lang))} ₪` : '';
  const title = `${String(item.donor_name || '—')}${amtPart}`;
  const lines = [
    item.frequency != null ? String(item.frequency) : undefined,
    item.start_date != null ? safeDateOnly(item.start_date, lang) : undefined,
  ];
  return rowShell(styles, index, title, lines);
}

export function renderCompletedTaskRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = String(item.title || '—');
  const lines = [item.category != null ? String(item.category) : undefined, item.updated_at != null ? safeDateOnly(item.updated_at, lang) : undefined];
  return rowShell(styles, index, title, lines);
}

export function renderUnknownStatRow(
  unknownLabel: string,
  index: number,
  styles: StatDetailRowStyles,
): React.ReactElement {
  return rowShell(styles, index, unknownLabel, []);
}
