// utils/logger.ts

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

  info(message: string, data?: LogData) {
    console.log(`[INFO] ${message}`, data || '');
  }

  warn(message: string, data?: LogData) {
    console.warn(`[WARN] ${message}`, data || '');
  }

  error(message: string, data?: LogData) {
    console.error(`[ERROR] ${message}`, data || '');
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