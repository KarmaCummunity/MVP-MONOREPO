/**
 * Shared helpers for ProfileScreen and its tab routes.
 */

export const safeStr = (v: unknown): string => String(v ?? '');
export const safeNum = (v: unknown): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

export const getLocationName = (loc: unknown): string => {
  if (!loc || typeof loc !== 'object') return '';
  const o = loc as Record<string, unknown>;
  return safeStr(o.name ?? o.city ?? o.address);
};

export const getRoleDisplayName = (role: string, t: (key: string) => string): string => {
  const key = `profile:roles.${role}`;
  const translated = t(key);
  return translated !== key ? translated : role;
};

export const formatRideTime = (dateIso: string) => {
  if (!dateIso) return { time: '', date: '' };
  const dep = new Date(dateIso);
  if (isNaN(dep.getTime())) return { time: '', date: '' };

  const hours = dep.getHours().toString().padStart(2, '0');
  const minutes = dep.getMinutes().toString().padStart(2, '0');

  const day = dep.getDate().toString().padStart(2, '0');
  const month = (dep.getMonth() + 1).toString().padStart(2, '0');
  const year = dep.getFullYear();

  return {
    time: `${hours}:${minutes}`,
    date: `${day}.${month}.${year}`
  };
};

export const isOpenStatus = (status: string, type: string): boolean => {
  if (type === 'item') {
    return status === 'available' || status === 'reserved';
  } else if (type === 'ride') {
    return status === 'active' || status === 'full';
  } else if (type === 'task') {
    return status === 'open' || status === 'in_progress';
  } else if (type === 'donation') {
    return status === 'active';
  }
  return true;
};

export const isClosedStatus = (status: string, type: string): boolean => {
  if (type === 'item') {
    return status === 'delivered' || status === 'completed';
  } else if (type === 'ride') {
    return status === 'completed';
  } else if (type === 'task') {
    return status === 'done' || status === 'archived';
  } else if (type === 'donation') {
    return status === 'completed';
  }
  return false;
};
