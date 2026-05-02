import type { FeedRideExtended } from '../types/feed';

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw) as unknown;
      return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function stripEmpty(ext: FeedRideExtended): FeedRideExtended | undefined {
  const cleaned = { ...ext };
  if (cleaned.preferences && Object.keys(cleaned.preferences).length === 0) {
    delete cleaned.preferences;
  }
  const keys = Object.keys(cleaned) as (keyof FeedRideExtended)[];
  const has =
    keys.some((k) => {
      const v = cleaned[k];
      if (v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v as object).length > 0;
      return true;
    }) ?? false;
  return has ? cleaned : undefined;
}

/** Maps `metadata.ride` (dedicated trump / merged post metadata) to FeedRideExtended. */
export function rideExtendedFromRideBlock(rideBlock: Record<string, unknown>): FeedRideExtended | undefined {
  const ext: FeedRideExtended = {};
  if (typeof rideBlock.notes === 'string' && rideBlock.notes.trim()) {
    ext.notes = rideBlock.notes.trim();
  }
  if (rideBlock.is_recurring === true) {
    ext.isRecurring = true;
    if (rideBlock.recurrence_frequency != null) {
      ext.recurrenceFrequency = Math.max(1, Number(rideBlock.recurrence_frequency) || 1);
    }
    if (rideBlock.recurrence_unit != null && String(rideBlock.recurrence_unit).length > 0) {
      ext.recurrenceUnit = String(rideBlock.recurrence_unit);
    }
  }
  if (typeof rideBlock.fuel_participation === 'string' && rideBlock.fuel_participation.length > 0) {
    ext.fuelParticipation = rideBlock.fuel_participation;
  }
  if (rideBlock.fuel_participation_max_nis != null && Number(rideBlock.fuel_participation_max_nis) > 0) {
    ext.fuelMaxNis = Number(rideBlock.fuel_participation_max_nis);
  }
  if (typeof rideBlock.smoking_preference === 'string' && rideBlock.smoking_preference.length > 0) {
    ext.smokingPreference = rideBlock.smoking_preference;
  }
  if (typeof rideBlock.gender_preference === 'string' && rideBlock.gender_preference.length > 0) {
    ext.genderPreference = rideBlock.gender_preference;
  }
  return stripEmpty(ext);
}

function requirementCodesFromString(raw: unknown): string[] | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Maps joined `rides` row (API `ride_data`) extras + `rides.metadata` JSON. */
export function rideExtendedFromRideDataJoin(rd: Record<string, unknown>): FeedRideExtended | undefined {
  const ext: FeedRideExtended = {};
  if (typeof rd.description === 'string' && rd.description.trim()) {
    ext.notes = rd.description.trim();
  }
  const codes = requirementCodesFromString(rd.requirements);
  if (codes?.length) {
    ext.requirementCodes = codes;
  }
  const meta = parseJsonObject(rd.metadata);
  if (meta) {
    if (meta.is_recurring === true) {
      ext.isRecurring = true;
      if (meta.recurrence_frequency != null) {
        ext.recurrenceFrequency = Math.max(1, Number(meta.recurrence_frequency) || 1);
      }
      if (meta.recurrence_unit != null && String(meta.recurrence_unit).length > 0) {
        ext.recurrenceUnit = String(meta.recurrence_unit);
      }
    }
    if (typeof meta.fuel_participation === 'string') {
      ext.fuelParticipation = String(meta.fuel_participation);
    }
    if (meta.fuel_participation_max_nis != null && Number(meta.fuel_participation_max_nis) > 0) {
      ext.fuelMaxNis = Number(meta.fuel_participation_max_nis);
    }
    if (typeof meta.smoking_preference === 'string') {
      ext.smokingPreference = String(meta.smoking_preference);
    }
    if (typeof meta.gender_preference === 'string') {
      ext.genderPreference = String(meta.gender_preference);
    }
    const pref = meta.preferences as Record<string, unknown> | undefined;
    if (pref && typeof pref === 'object') {
      const p: NonNullable<FeedRideExtended['preferences']> = {};
      if (pref.no_smoking === true || pref.noSmoking === true) p.noSmoking = true;
      if (pref.pets_allowed === true || pref.petsAllowed === true) p.petsAllowed = true;
      if (pref.kids_friendly === true || pref.kidsFriendly === true) p.kidsFriendly = true;
      if (Object.keys(p).length) ext.preferences = p;
    }
  }
  return stripEmpty(ext);
}

export function mergeFeedRideExtended(
  a: FeedRideExtended | undefined,
  b: FeedRideExtended | undefined,
): FeedRideExtended | undefined {
  if (!a) return b ? stripEmpty({ ...b }) : undefined;
  if (!b) return stripEmpty({ ...a });
  const merged: FeedRideExtended = {
    ...a,
    ...b,
    requirementCodes: b.requirementCodes ?? a.requirementCodes,
    preferences: { ...a.preferences, ...b.preferences },
  };
  if (merged.preferences && Object.keys(merged.preferences).length === 0) {
    delete merged.preferences;
  }
  return stripEmpty(merged);
}
