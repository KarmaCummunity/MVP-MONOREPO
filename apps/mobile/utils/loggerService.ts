// Enhanced Logger service that saves logs to both console and file with performance optimization
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGS_KEY = 'app_debug_logs';
const MAX_LOGS = 200; // Keep last 200 log entries (reduced from 1000 to prevent quota issues)
const BATCH_SIZE = 50; // Save logs in batches to improve performance
const SAVE_INTERVAL = 5000; // Save logs every 5 seconds

// Environment detection - safe check for __DEV__
let isDevelopment = false;
try {
  isDevelopment = typeof __DEV__ === 'undefined' ? false : __DEV__;
} catch {
  // If __DEV__ is not defined, assume production
  isDevelopment = false;
}
const isProduction = !isDevelopment;

export interface LogOptions {
  /** Recurring noise (polling, focus handlers). Still stored for export; omitted from console by default. */
  periodic?: boolean;
}

/** Stored log levels; `routeFocus` = screen/stack gained focus (not generic info). */
export type LogEntryLevel = 'debug' | 'routeFocus' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogEntryLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
  periodic?: boolean;
  /** Legacy persisted rows (pre–routeFocus level); kept for export formatting only. */
  screenPresentation?: boolean;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/** Single place for level → console mapping (avoids duplicated switch in addLog). */
const CONSOLE_EMIT: Record<LogEntryLevel, (line: string) => void> = {
  debug: (line) => {
    console.debug(`🔍 ${line}`);
  },
  routeFocus: (line) => {
    console.info(`🖥️  ${line}`);
  },
  info: (line) => {
    console.info(`ℹ️  ${line}`);
  },
  warn: (line) => {
    console.warn(`⚠️  ${line}`);
  },
  error: (line) => {
    console.error(`❌ ${line}`);
  },
};

function formatLogEntryForExport(log: LogEntry): string {
  const periodicTag = log.periodic ? ' [PERIODIC]' : '';
  const legacyScreenTag = log.screenPresentation && log.level !== 'routeFocus' ? ' [SCREEN_OPEN]' : '';
  const dataSuffix = log.data ? ` ${JSON.stringify(log.data)}` : '';
  const levelLabel = log.level === 'routeFocus' ? 'ROUTE_FOCUS' : log.level.toUpperCase();
  return `[${log.timestamp}] ${levelLabel} ${log.component}:${periodicTag}${legacyScreenTag} ${log.message}${dataSuffix}`;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private pendingLogs: LogEntry[] = [];
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  // Production-friendly: Higher log level in production
  private logLevel: LogLevel = isProduction ? 'warn' : 'debug';
  private enableConsoleOutput = !isProduction;
  private enableStorage = true;
  private initRequested = false;

  /** Schedules storage load + batch timer; not called from constructor (Sonar S7059). */
  private requestInitialization(): void {
    if (this.initRequested) return;
    this.initRequested = true;
    void this.initializeAsync();
  }

  private async initializeAsync() {
    if (!this.isInitialized) {
      await this.loadLogs();
      this.startBatchTimer();
      this.isInitialized = true;
    }
  }

  private async loadLogs() {
    if (!this.enableStorage) return;

    try {
      const stored = await AsyncStorage.getItem(LOGS_KEY);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        // Keep only recent logs to prevent quota issues
        this.logs = Array.isArray(parsedLogs) ? parsedLogs.slice(-MAX_LOGS) : [];

        // If we had to trim logs, save the trimmed version
        if (Array.isArray(parsedLogs) && parsedLogs.length > MAX_LOGS) {
          await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(this.logs));
          if (this.enableConsoleOutput) {
            console.info(`🗑️ Trimmed logs from ${parsedLogs.length} to ${this.logs.length} entries`);
          }
        }
      }
    } catch (error: any) {
      // If we can't load logs (corrupted or quota exceeded), clear them
      if (this.enableConsoleOutput) {
        console.warn('⚠️ Failed to load logs, clearing storage:', error?.message || error);
      }
      this.logs = [];
      try {
        await AsyncStorage.removeItem(LOGS_KEY);
      } catch {
        // Ignore errors when removing
      }
    }
  }

  private mergePendingIntoLogs(): void {
    this.logs = [...this.logs, ...this.pendingLogs];
    this.pendingLogs = [];
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }
  }

  private isQuotaError(error: unknown): boolean {
    const err = error as { name?: string; message?: string } | undefined;
    return err?.name === 'QuotaExceededError' || Boolean(err?.message?.includes('quota'));
  }

  private async persistMergedLogs(): Promise<void> {
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(this.logs));
  }

  private async handleSaveQuotaExceeded(): Promise<void> {
    this.logs = this.logs.slice(-100);
    await this.persistMergedLogs();
    if (this.enableConsoleOutput) {
      console.warn('⚠️ Storage quota exceeded, cleared old logs and saved recent 100 entries');
    }
  }

  private async disableStorageAfterSaveFailure(retryError: unknown): Promise<void> {
    this.enableStorage = false;
    this.logs = [];
    this.pendingLogs = [];
    try {
      await AsyncStorage.removeItem(LOGS_KEY);
    } catch {
      // Ignore errors when removing
    }
    if (this.enableConsoleOutput) {
      console.error('❌ Failed to save logs even after cleanup, storage disabled:', retryError);
    }
  }

  private async saveLogs() {
    if (!this.enableStorage || this.pendingLogs.length === 0) return;

    try {
      this.mergePendingIntoLogs();
      await this.persistMergedLogs();
    } catch (error: unknown) {
      if (!this.isQuotaError(error)) {
        if (this.enableConsoleOutput) {
          console.error('Failed to save logs:', error);
        }
        return;
      }
      try {
        await this.handleSaveQuotaExceeded();
      } catch (retryError) {
        await this.disableStorageAfterSaveFailure(retryError);
      }
    }
  }

  private startBatchTimer() {
    if (this.saveTimer) clearInterval(this.saveTimer);

    this.saveTimer = setInterval(() => {
      this.saveLogs();
    }, SAVE_INTERVAL);
  }

  /** Threshold order for filtering; `routeFocus` aligns with `info` (diagnostic, not warn/error). */
  private shouldLog(level: LogEntryLevel): boolean {
    const threshold = { debug: 0, routeFocus: 1, info: 1, warn: 2, error: 3, none: 4 };
    return threshold[level] >= threshold[this.logLevel];
  }

  private addLog(
    level: LogEntryLevel,
    component: string,
    message: string,
    data?: Record<string, unknown>,
    options?: LogOptions
  ) {
    // Early return if log level is not enabled
    if (!this.shouldLog(level)) return;

    this.requestInitialization();

    const periodic = options?.periodic === true;
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      periodic,
    };

    // Add to pending logs for batching
    this.pendingLogs.push(logEntry);

    // Force save if batch is full
    if (this.pendingLogs.length >= BATCH_SIZE) {
      this.saveLogs();
    }

    // Console: developer message only — no serialized payloads (Sonar / sensitive data).
    // Periodic logs are intentionally not printed (nav focus, polling) to avoid console spam.
    if (this.enableConsoleOutput && !periodic) {
      const prefix = `[${logEntry.timestamp}] ${component}:`;
      const consoleLine = `${prefix} ${message}`;
      CONSOLE_EMIT[level](consoleLine);
    }
  }

  debug(component: string, message: string, data?: Record<string, unknown>, options?: LogOptions) {
    this.addLog('debug', component, message, data, options);
  }

  routeFocus(component: string, message: string, data?: Record<string, unknown>, options?: LogOptions) {
    this.addLog('routeFocus', component, message, data, options);
  }

  info(component: string, message: string, data?: Record<string, unknown>, options?: LogOptions) {
    this.addLog('info', component, message, data, options);
  }

  warn(component: string, message: string, data?: Record<string, unknown>, options?: LogOptions) {
    this.addLog('warn', component, message, data, options);
  }

  error(component: string, message: string, data?: Record<string, unknown>, options?: LogOptions) {
    this.addLog('error', component, message, data, options);
  }

  // Compatibility methods for legacy logger API
  logScreenNavigation(fromScreen: string, toScreen: string, userId?: string) {
    this.info('Navigation', 'Screen navigation', {
      fromScreen,
      toScreen,
      userId,
    });
  }

  /** Log once per navigation focus when a screen/modal is shown (use `useLogScreenOpened` at call sites). */
  logScreenOpened(screenName: string, data?: Record<string, unknown>) {
    this.addLog('routeFocus', screenName, 'Screen opened', data);
  }

  logUserAction(action: string, screen: string, data?: any, userId?: string) {
    this.info(screen, 'User action', {
      action,
      ...(typeof data === 'object' && data !== null ? data : { data }),
      userId,
    });
  }

  logError(error: any, context: string, screen?: string, userId?: string) {
    this.error(screen || 'Error', 'Application error', {
      context,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
      },
      userId,
    });
  }

  logApiCall(endpoint: string, method: string, status: number, duration: number, userId?: string) {
    this.info('API', 'API call', {
      endpoint,
      method,
      status,
      duration,
      userId,
    });
  }

  // Configuration methods
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  setConsoleOutput(enabled: boolean) {
    this.enableConsoleOutput = enabled;
  }

  setStorageEnabled(enabled: boolean) {
    this.enableStorage = enabled;
  }

  async exportLogs(): Promise<string> {
    this.requestInitialization();
    return this.logs.map(formatLogEntryForExport).join('\n');
  }

  async clearLogs() {
    this.requestInitialization();
    this.logs = [];
    this.pendingLogs = [];
    if (this.enableStorage) {
      await AsyncStorage.removeItem(LOGS_KEY);
    }
    if (this.enableConsoleOutput) {
      console.info('🗑️ All logs cleared');
    }
  }

  async downloadLogs() {
    this.requestInitialization();
    if (Platform.OS === 'web') {
      // Force save pending logs before export
      await this.saveLogs();

      const logsText = await this.exportLogs();
      const element = document.createElement('a');
      const file = new Blob([logsText], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `karma-community-logs-${new Date().toISOString().slice(0, 19)}.txt`;
      document.body.appendChild(element);
      element.click();
      element.remove();

      if (this.enableConsoleOutput) {
        console.info('📁 Logs downloaded');
      }
    }
  }

  async showLogs() {
    this.requestInitialization();
    // Force save pending logs before showing
    await this.saveLogs();

    const logsText = await this.exportLogs();
    if (this.enableConsoleOutput) {
      console.info('📋 Complete logs:');
      console.info(logsText);
    }
    return logsText;
  }

  // Cleanup method - call this when app is closing
  destroy() {
    this.requestInitialization();
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    // Force save any pending logs
    this.saveLogs();
  }
}

export const logger = new LoggerService();

export interface BoundLogger {
  debug: (message: string, data?: Record<string, unknown>, options?: LogOptions) => void;
  routeFocus: (message: string, data?: Record<string, unknown>, options?: LogOptions) => void;
  info: (message: string, data?: Record<string, unknown>, options?: LogOptions) => void;
  warn: (message: string, data?: Record<string, unknown>, options?: LogOptions) => void;
  error: (message: string, data?: Record<string, unknown>, options?: LogOptions) => void;
}

const BOUND_LEVELS = ['debug', 'routeFocus', 'info', 'warn', 'error'] as const;

/** Bound component name for shorter call sites (single implementation, no per-method duplication). */
export function createLogger(component: string): BoundLogger {
  const bound = {} as BoundLogger;
  for (const level of BOUND_LEVELS) {
    bound[level] = (message: string, data?: Record<string, unknown>, options?: LogOptions) => {
      logger[level](component, message, data, options);
    };
  }
  return bound;
}
