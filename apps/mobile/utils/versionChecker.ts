/**
 * Version Checker - בדיקת עדכונים חדשים לאפליקציה
 * מטרה: להבטיח שמשתמשים תמיד יראו את הגרסה העדכנית ביותר
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // בדיקה כל 5 דקות
const CURRENT_VERSION = '2.3.0'; // תתעדכן אוטומטית מ-package.json

/**
 * קריאת הגרסה הנוכחית מה-meta tag
 */
function getCurrentVersion(): string {
  if (typeof document === 'undefined') return CURRENT_VERSION;
  const metaTag = document.querySelector('meta[name="app-version"]');
  return metaTag?.getAttribute('content') || CURRENT_VERSION;
}

/**
 * קריאת ה-timestamp של ה-build הנוכחי
 */
function getCurrentBuildTimestamp(): string | null {
  if (typeof document === 'undefined') return null;
  const metaTag = document.querySelector('meta[name="build-timestamp"]');
  return metaTag?.getAttribute('content');
}

/**
 * בדיקה אם יש גרסה חדשה זמינה
 */
async function checkForUpdates(): Promise<boolean> {
  try {
    // מבצעים fetch ל-index.html עם no-cache כדי לקבל את הגרסה העדכנית ביותר
    const response = await fetch('/index.html', {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('Failed to check for updates');
      return false;
    }

    // בודקים את ה-ETag או Last-Modified header
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    
    // שומרים את הערכים הקודמים
    const previousETag = localStorage.getItem('app-etag');
    const previousLastModified = localStorage.getItem('app-last-modified');

    // אם יש שינוי ב-ETag או Last-Modified, יש עדכון חדש
    const hasUpdate = (etag && etag !== previousETag) || 
                     (lastModified && lastModified !== previousLastModified);

    if (hasUpdate) {
      // שומרים את הערכים החדשים
      if (etag) localStorage.setItem('app-etag', etag);
      if (lastModified) localStorage.setItem('app-last-modified', lastModified);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
}

/**
 * מציג הודעה למשתמש שיש עדכון זמין
 */
function showUpdateNotification() {
  // בודקים אם כבר הצגנו הודעה (למניעת spam)
  const lastNotification = localStorage.getItem('last-update-notification');
  const now = Date.now();
  
  if (lastNotification && now - parseInt(lastNotification) < VERSION_CHECK_INTERVAL) {
    return; // כבר הצגנו הודעה לאחרונה
  }

  localStorage.setItem('last-update-notification', now.toString());

  // יצירת הודעה נאה
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
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
      🎉 גרסה חדשה זמינה!
    </div>
    <div style="font-size: 13px; opacity: 0.9;">
      לחץ כאן כדי לרענן ולקבל את העדכון האחרון
    </div>
  `;

  // הוספת אנימציה
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

  // כשלוחצים על ההודעה - מרעננים
  notification.addEventListener('click', () => {
    window.location.reload();
  });

  // אוטו-סגירה אחרי 10 שניות
  setTimeout(() => {
    notification.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 10000);

  document.body.appendChild(notification);
}

/**
 * מנקה את ה-cache של הדפדפן
 */
async function clearBrowserCache() {
  try {
    // ניקוי Service Worker cache
    if ('serviceWorker' in navigator && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // ניקוי localStorage של הודעות ישנות
    localStorage.removeItem('last-update-notification');
    
    console.log('Browser cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * מאתחל את בודק הגרסאות
 */
export function initVersionChecker() {
  // Only run on web platform
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('Version checker: Not running on web platform');
    return;
  }

  console.log(`KC App Version: ${getCurrentVersion()}`);
  console.log(`Build Timestamp: ${getCurrentBuildTimestamp()}`);

  // בדיקה ראשונית אחרי 10 שניות (לאחר שהאפליקציה נטענה)
  setTimeout(async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification();
    }
  }, 10000);

  // בדיקה תקופתית
  setInterval(async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification();
    }
  }, VERSION_CHECK_INTERVAL);

  // בדיקה כאשר המשתמש חוזר לטאב (focus)
  window.addEventListener('focus', async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification();
    }
  });

  // בדיקה כאשר המשתמש חוזר אונליין
  window.addEventListener('online', async () => {
    const hasUpdate = await checkForUpdates();
    if (hasUpdate) {
      showUpdateNotification();
    }
  });
}

/**
 * כפיית רענון האפליקציה (שימושי לדפי אדמין)
 */
export async function forceAppUpdate() {
  await clearBrowserCache();
  window.location.reload();
}

/**
 * קבלת מידע על הגרסה הנוכחית
 */
export function getVersionInfo() {
  return {
    version: getCurrentVersion(),
    buildTimestamp: getCurrentBuildTimestamp(),
    buildDate: getCurrentBuildTimestamp() 
      ? new Date(parseInt(getCurrentBuildTimestamp()!) * 1000).toLocaleString('he-IL')
      : 'Unknown',
  };
}

