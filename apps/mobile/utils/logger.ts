// utils/logger.ts — delegates to central RN logger service (no raw console.log).
import { logger as appLogger } from './loggerService';

const LOGGER_LEGACY_COMPONENT = 'LegacyLogger';
export interface LogData {
  screen?: string;
  action?: string;
  userId?: string;
  error?: any;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private forward(
    method: 'info' | 'warn' | 'error',
    message: string,
    data?: LogData
  ) {
    if (data !== undefined && Object.keys(data).length > 0) {
      appLogger[method](LOGGER_LEGACY_COMPONENT, message, data as Record<string, unknown>);
    } else {
      appLogger[method](LOGGER_LEGACY_COMPONENT, message);
    }
  }

  info(message: string, data?: LogData) {
    this.forward('info', message, data);
  }

  warn(message: string, data?: LogData) {
    this.forward('warn', message, data);
  }

  error(message: string, data?: LogData) {
    this.forward('error', message, data);
  }

  // Screen navigation logging
  logScreenNavigation(fromScreen: string, toScreen: string, userId?: string) {
    this.info('Screen navigation', {
      screen: 'navigation',
      action: 'navigate',
      fromScreen,
      toScreen,
      userId
    });
  }

  // User action logging
  logUserAction(action: string, screen: string, data?: any, userId?: string) {
    this.info('User action', {
      screen,
      action,
      data,
      userId
    });
  }

  // Error logging with context
  logError(error: any, context: string, screen?: string, userId?: string) {
    this.error('Application error', {
      screen,
      action: context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      userId
    });
  }

  // API call logging
  logApiCall(endpoint: string, method: string, status: number, duration: number, userId?: string) {
    this.info('API call', {
      screen: 'api',
      action: 'request',
      endpoint,
      method,
      status,
      duration,
      userId
    });
  }
}

export const logger = Logger.getInstance();
export default logger; 