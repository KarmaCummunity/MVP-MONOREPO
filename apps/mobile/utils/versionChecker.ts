/**
 * Version Checker - Check for new app updates
 * Ensures users see the latest version (web).
 */

import colors from '../globals/colors';
import { logger } from './loggerService';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const CURRENT_VERSION = '2.3.0'; // Update from package.json as needed

function getCurrentVersion(): string {
  if (typeof document === 'undefined') return CURRENT_VERSION;
  const metaTag = document.querySelector('meta[name="app-version"]');
  return metaTag?.getAttribute('content') || CURRENT_VERSION;
}

function getCurrentBuildTimestamp(): string | null {
  if (typeof document === 'undefined') return null;
  const metaTag = document.querySelector('meta[name="build-timestamp"]');
  return metaTag?.getAttribute('content') ?? null;
}

async function checkForUpdates(): Promise<boolean> {
  try {
    const response = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      logger.warn('versionChecker', 'Failed to check for updates');
      return false;
    }

    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    const previousETag = localStorage.getItem('app-etag');
    const previousLastModified = localStorage.getItem('app-last-modified');

    const hasUpdate = (etag && etag !== previousETag) ||
      (lastModified && lastModified !== previousLastModified);

    if (hasUpdate) {
      if (etag) localStorage.setItem('app-etag', etag);
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('versionChecker', 'Error checking for updates', { error });
    return false;
  }
}

export type VersionCheckerOptions = {
  getText?: (key: string) => string;
};

function showUpdateNotification(getText?: (key: string) => string) {
  const lastNotification = localStorage.getItem('last-update-notification');
  const now = Date.now();

  if (lastNotification && now - parseInt(lastNotification, 10) < VERSION_CHECK_INTERVAL) {
    return;
  }

  localStorage.setItem('last-update-notification', now.toString());

  const title = getText ? getText('common:versionCheck.newVersionAvailable') : 'New version available!';
  const subtitle = getText ? getText('common:versionCheck.tapToRefresh') : 'Tap here to refresh and get the latest update';

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
    color: ${colors.textInverse};
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 20px ${colors.overlayLight};
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 15px;
    font-weight: 500;
    direction: rtl;
    text-align: center;
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
    cursor: pointer;
  `;

  notification.innerHTML = `
    <div style="margin-bottom: 8px;">
      ${title}
    </div>
    <div style="font-size: 13px; opacity: 0.9;">
      ${subtitle}
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translate(-50%, -20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }
  `;
  document.head.appendChild(style);

  notification.addEventListener('click', () => {
    window.location.reload();
  });
  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 10000);

  document.body.appendChild(notification);
}

async function clearBrowserCache() {
  try {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    localStorage.removeItem('last-update-notification');

    logger.info('versionChecker', 'Browser cache cleared successfully');
  } catch (error) {
    logger.error('versionChecker', 'Error clearing cache', { error });
  }
}

export function initVersionChecker(options?: VersionCheckerOptions) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    logger.info('versionChecker', 'Not running on web platform');
    return;
  }

  const getText = options?.getText;

  logger.info('versionChecker', 'KC App version', { version: getCurrentVersion(), buildTimestamp: getCurrentBuildTimestamp() });

  setTimeout(async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification(getText);
    }
  }, 10000);

  setInterval(async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification(getText);
    }
  }, VERSION_CHECK_INTERVAL);

  window.addEventListener('focus', async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification(getText);
    }
  });

  window.addEventListener('online', async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification(getText);
    }
  });
}

export async function forceAppUpdate() {
  await clearBrowserCache();
  window.location.reload();
}

export function getVersionInfo() {
  return {
    version: getCurrentVersion(),
    buildTimestamp: getCurrentBuildTimestamp(),
    buildDate: getCurrentBuildTimestamp()
      ? new Date(parseInt(getCurrentBuildTimestamp()!, 10) * 1000).toLocaleString('he-IL')
      : 'Unknown',
  };
}
