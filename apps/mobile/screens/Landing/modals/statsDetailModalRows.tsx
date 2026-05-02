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

/** ISO string / number timestamp / Date — never String(object). */
function toDateInputString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return '';
}

function safeDate(value: unknown, lang: string | undefined): string {
  const raw = toDateInputString(value);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(dateLocale(lang));
}

function safeDateOnly(value: unknown, lang: string | undefined): string {
  const raw = toDateInputString(value);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(dateLocale(lang));
}

function trimmedNonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function displayFromPlainObject(o: Record<string, unknown>): string | undefined {
  const fromName = trimmedNonEmpty(o.name);
  if (fromName !== undefined) {
    return fromName;
  }
  const fromCity = trimmedNonEmpty(o.city);
  if (fromCity !== undefined) {
    return fromCity;
  }
  return trimmedNonEmpty(o.label);
}

/** Small stable key for list items without using array index alone (Sonar). */
function subLineKey(rowIndex: number, text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return `row-${rowIndex}-h${String(h)}`;
}

/**
 * Safe display for API row fields: primitives as text; plain objects with common keys (name, city, label).
 */
export function optionalDisplayString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return trimmedNonEmpty(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return displayFromPlainObject(value as Record<string, unknown>);
  }
  return undefined;
}

function assignStableSubLineIds(rowIndex: number, lines: string[]): { id: string; text: string }[] {
  const used = new Set<string>();
  return lines.map((text) => {
    let id = subLineKey(rowIndex, text);
    let suffix = 0;
    while (used.has(id)) {
      suffix += 1;
      id = `${subLineKey(rowIndex, text)}-d${suffix}`;
    }
    used.add(id);
    return { id, text };
  });
}

function rowShell(
  styles: StatDetailRowStyles,
  index: number,
  primary: string,
  lines: (string | null | undefined)[],
): React.ReactElement {
  const nonEmptyLines = lines.filter(
    (line): line is string => typeof line === 'string' && line.trim().length > 0,
  );
  const keyed = assignStableSubLineIds(index, nonEmptyLines);
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailItemNumber}>{index + 1}.</Text>
      <View style={styles.detailItemContent}>
        <Text style={styles.detailItemText}>{primary}</Text>
        {keyed.map((entry) => (
          <Text key={entry.id} style={styles.detailItemSubtext}>
            {entry.text}
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
  let uaStr: string | undefined;
  if (typeof ua === 'string' && ua.length > 0) {
    uaStr = ua.length > 50 ? `${ua.slice(0, 50)}…` : ua;
  }
  const sublines = uaStr === undefined ? [] : [uaStr];
  return rowShell(styles, index, safeDate(item.timestamp ?? item.created_at, lang), sublines);
}

export function renderTotalUserRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = optionalDisplayString(item.name) ?? optionalDisplayString(item.email) ?? '—';
  const cityLine = optionalDisplayString(item.city);
  const lines = [safeDateOnly(item.join_date ?? item.created_at, lang), cityLine];
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
  const title = `${optionalDisplayString(item.donor_name) ?? '—'} • ${amt} ₪`;
  const categoryLine = optionalDisplayString(item.category_name);
  const lines = [safeDateOnly(item.donation_date ?? item.created_at, lang), categoryLine];
  return rowShell(styles, index, title, lines);
}

export function renderItemDonationRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = optionalDisplayString(item.title) ?? optionalDisplayString(item.item_name) ?? '—';
  const donorLine = optionalDisplayString(item.donor_name);
  const lines = [safeDateOnly(item.created_at, lang), donorLine];
  return rowShell(styles, index, title, lines);
}

export function renderCompletedRideRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = `${optionalDisplayString(item.from_city) ?? '—'} → ${optionalDisplayString(item.to_city) ?? '—'}`;
  const driverLine = optionalDisplayString(item.driver_name);
  const lines = [safeDateOnly(item.ride_date ?? item.created_at, lang), driverLine];
  return rowShell(styles, index, title, lines);
}

export function renderDonorRecurringRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const rawAmount = item.amount;
  const amount = rawAmount === undefined || rawAmount === null ? null : Number(rawAmount);
  const amtPart =
    amount !== null && Number.isFinite(amount) ? ` • ${amount.toLocaleString(dateLocale(lang))} ₪` : '';
  const title = `${optionalDisplayString(item.donor_name) ?? '—'}${amtPart}`;
  const frequencyLine = optionalDisplayString(item.frequency);
  let startDateLine: string | undefined;
  if (item.start_date != null) {
    startDateLine = safeDateOnly(item.start_date, lang);
  }
  const lines = [frequencyLine, startDateLine];
  return rowShell(styles, index, title, lines);
}

export function renderCompletedTaskRow(
  item: Record<string, unknown>,
  index: number,
  lang: string | undefined,
  styles: StatDetailRowStyles,
): React.ReactElement {
  const title = optionalDisplayString(item.title) ?? '—';
  const categoryLine = optionalDisplayString(item.category);
  let updatedLine: string | undefined;
  if (item.updated_at != null) {
    updatedLine = safeDateOnly(item.updated_at, lang);
  }
  const lines = [categoryLine, updatedLine];
  return rowShell(styles, index, title, lines);
}

export function renderUnknownStatRow(
  unknownLabel: string,
  index: number,
  styles: StatDetailRowStyles,
): React.ReactElement {
  return rowShell(styles, index, unknownLabel, []);
}
