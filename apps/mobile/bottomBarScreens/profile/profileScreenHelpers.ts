/** Localized role labels (Hebrew). */
export const getRoleDisplayName = (role: string): string => {
  const roleTranslations: Record<string, string> = {
    'user': 'משתמש',
    'donor': 'תורם',
    'volunteer': 'מתנדב',
    'recipient': 'מקבל עזרה',
    'organization': 'עמותה',
    'student': 'סטודנט'
  };
  return roleTranslations[role] || role;
};

/** Formats ride time safely for display. */
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

/** Reserved for future filtering; kept in sync with original file. */
export const _isOpenStatus = (status: string, type: string): boolean => {
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

/** Reserved for future filtering; kept in sync with original file. */
export const _isClosedStatus = (status: string, type: string): boolean => {
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
