/**
 * Ensures at most one browser tab actively runs the web app for this origin.
 * Uses a short-lived leader lock in localStorage (renewed by the leader tab).
 * Other tabs show a lightweight placeholder until the lock is released or expires.
 */

const LOCK_KEY = 'kc_web_app_singleton_lock';
const LEASE_MS = 5000;
const RENEW_INTERVAL_MS = 1200;
const FOLLOWER_POLL_MS = 2000;

type LockPayload = { owner: string; expires: number };

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function readLock(): LockPayload | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LockPayload;
    if (typeof parsed?.owner !== 'string' || typeof parsed?.expires !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLock(owner: string, expires: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ owner, expires }));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Attempt to become leader: succeeds when lock is missing, expired, or already owned by this tab.
 */
export function tryAcquireSingletonLeader(ownerId: string): boolean {
  const now = Date.now();
  const current = readLock();
  if (!current || now > current.expires || current.owner === ownerId) {
    writeLock(ownerId, now + LEASE_MS);
    const after = readLock();
    return !!after && after.owner === ownerId;
  }
  return false;
}

/** Extend lease if this tab is still the leader. Returns false if lock was lost or invalid. */
export function renewSingletonLeader(ownerId: string): boolean {
  const now = Date.now();
  const current = readLock();
  if (!current || current.owner !== ownerId) {
    return false;
  }
  if (now > current.expires) {
    return tryAcquireSingletonLeader(ownerId);
  }
  writeLock(ownerId, now + LEASE_MS);
  return true;
}

export function createSingletonTabController(): {
  ownerId: string;
  isLeader: () => boolean;
  start: (onLeaderChange: (isLeader: boolean) => void) => () => void;
} {
  const ownerId = randomId();

  const isLeader = (): boolean => {
    const current = readLock();
    return !!current && current.owner === ownerId && Date.now() <= current.expires;
  };

  const start = (onLeaderChange: (isLeader: boolean) => void): (() => void) => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      onLeaderChange(true);
      return () => {};
    }

    let leader = tryAcquireSingletonLeader(ownerId);
    onLeaderChange(leader);

    const renewTimer = window.setInterval(() => {
      if (leader) {
        const still = renewSingletonLeader(ownerId);
        if (!still) {
          leader = false;
          onLeaderChange(false);
        }
      } else if (tryAcquireSingletonLeader(ownerId)) {
        leader = true;
        onLeaderChange(true);
      }
    }, RENEW_INTERVAL_MS);

    const pollTimer = window.setInterval(() => {
      if (!leader && tryAcquireSingletonLeader(ownerId)) {
        leader = true;
        onLeaderChange(true);
      }
    }, FOLLOWER_POLL_MS);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCK_KEY) return;
      if (leader) {
        const still = renewSingletonLeader(ownerId);
        if (!still) {
          leader = false;
          onLeaderChange(false);
        }
      } else if (tryAcquireSingletonLeader(ownerId)) {
        leader = true;
        onLeaderChange(true);
      }
    };

    window.addEventListener('storage', onStorage);

    const dispose = () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', dispose);
      window.clearInterval(renewTimer);
      window.clearInterval(pollTimer);
      try {
        const cur = readLock();
        if (cur?.owner === ownerId) {
          localStorage.removeItem(LOCK_KEY);
        }
      } catch {
        /* ignored */
      }
    };

    window.addEventListener('pagehide', dispose);

    return dispose;
  };

  return { ownerId, isLeader, start };
}
