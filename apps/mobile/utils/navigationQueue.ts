// utils/navigationQueue.ts
// Navigation queue manager - ensures navigation actions are executed sequentially
// Prevents race conditions and navigation conflicts

import { NavigationContainerRef, StackActions } from '@react-navigation/native';
import {
  QueuedNavigationAction,
  NavigationQueueItem,
  NavigateAction,
  ResetAction,
  ReplaceAction,
  GoBackAction,
  SetParamsAction
} from '../types/navigation';
import { logger } from './loggerService';

const LOG_SOURCE = 'NavigationQueue';

class NavigationQueue {
  private queue: NavigationQueueItem[] = [];
  private isProcessing = false;
  private navigationRef: NavigationContainerRef<any> | null = null;
  private defaultPriority = 0;

  /**
   * Initialize the navigation queue with a navigation ref
   */
  initialize(ref: NavigationContainerRef<any> | null): void {
    this.navigationRef = ref;
    logger.debug(LOG_SOURCE, 'Navigation queue initialized', { hasRef: !!ref });
  }

  /**
   * Check if navigation is ready
   */
  private isReady(): boolean {
    return this.navigationRef !== null && this.navigationRef.isReady();
  }

  /**
   * Add navigation action to queue
   */
  private enqueue(
    action: QueuedNavigationAction,
    priority: number = this.defaultPriority
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const item: NavigationQueueItem = {
        id: `${Date.now()}-${Math.random()}`,
        action,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(q => q.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIndex, 0, item);
      }

      logger.debug(LOG_SOURCE, 'Navigation action enqueued', {
        id: item.id,
        type: action.type,
        priority,
        queueLength: this.queue.length,
      });

      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the navigation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      // Wait a bit to ensure previous navigation completed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check if navigation is ready
      if (!this.isReady()) {
        logger.warn(LOG_SOURCE, 'Navigation not ready, skipping action', {
          id: item.id,
          type: item.action.type,
        });
        item.reject(new Error('Navigation not ready'));
        continue;
      }

      try {
        await this.executeAction(item.action);
        item.resolve();
        logger.debug(LOG_SOURCE, 'Navigation action executed successfully', {
          id: item.id,
          type: item.action.type,
        });
      } catch (error) {
        logger.error(LOG_SOURCE, 'Navigation action failed', {
          id: item.id,
          type: item.action.type,
          error,
        });
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Execute a navigation action
   */
  private async executeAction(action: QueuedNavigationAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    switch (action.type) {
      case 'navigate':
        await this.executeNavigate(action);
        break;
      case 'reset':
        await this.executeReset(action);
        break;
      case 'replace':
        await this.executeReplace(action);
        break;
      case 'goBack':
        await this.executeGoBack(action);
        break;
      case 'setParams':
        await this.executeSetParams(action);
        break;
      default:
        throw new Error(`Unknown navigation action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute navigate action
   */
  private async executeNavigate(action: NavigateAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    (this.navigationRef.navigate as any)(action.routeName, action.params);
  }

  /**
   * Execute reset action
   */
  private async executeReset(action: ResetAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    this.navigationRef.reset({
      index: action.index,
      routes: action.routes as any,
    });
  }

  /**
   * Execute replace action
   */
  private async executeReplace(action: ReplaceAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    // Use StackActions.replace with dispatch since NavigationContainerRef doesn't have replace directly
    this.navigationRef.dispatch(
      StackActions.replace(action.routeName, action.params)
    );
  }

  /**
   * Execute goBack action
   */
  private async executeGoBack(_action: GoBackAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    this.navigationRef.goBack();
  }

  /**
   * Execute setParams action
   */
  private async executeSetParams(action: SetParamsAction): Promise<void> {
    if (!this.navigationRef) {
      throw new Error('Navigation ref not initialized');
    }

    // setParams requires getting the current route first
    const state = this.navigationRef.getRootState();
    if (!state) {
      throw new Error('Cannot get navigation state for setParams');
    }

    // Find the current route
    const findCurrentRoute = (navState: any): any => {
      if (!navState.routes || navState.routes.length === 0) {
        return null;
      }
      const currentRoute = navState.routes[navState.index || 0];
      if (currentRoute.state) {
        return findCurrentRoute(currentRoute.state);
      }
      return currentRoute;
    };

    const currentRoute = findCurrentRoute(state);
    if (!currentRoute) {
      throw new Error('Cannot find current route for setParams');
    }

    // Use the route's key to set params
    if (currentRoute.key) {
      this.navigationRef.setParams({
        ...currentRoute.params,
        ...action.params,
      } as any);
    } else {
      // Fallback: try to set params on the current route
      this.navigationRef.setParams(action.params as any);
    }
  }

  /**
   * Public API: Navigate to a route
   */
  navigate(routeName: string, params?: Record<string, any>, priority: number = 0): Promise<void> {
    return this.enqueue(
      {
        type: 'navigate',
        routeName,
        params,
      },
      priority
    );
  }

  /**
   * Public API: Reset navigation stack
   */
  reset(index: number, routes: Array<{ name: string; params?: Record<string, any> }>, priority: number = 1): Promise<void> {
    return this.enqueue(
      {
        type: 'reset',
        index,
        routes,
      },
      priority
    );
  }

  /**
   * Public API: Replace current route
   */
  replace(routeName: string, params?: Record<string, any>, priority: number = 1): Promise<void> {
    return this.enqueue(
      {
        type: 'replace',
        routeName,
        params,
      },
      priority
    );
  }

  /**
   * Public API: Go back
   */
  goBack(priority: number = 0): Promise<void> {
    return this.enqueue(
      {
        type: 'goBack',
      },
      priority
    );
  }

  /**
   * Public API: Set params on current route
   */
  setParams(params: Record<string, any>, priority: number = 0): Promise<void> {
    return this.enqueue(
      {
        type: 'setParams',
        params,
      },
      priority
    );
  }

  /**
   * Clear the queue (useful for cleanup or error recovery)
   */
  clear(): void {
    const items = [...this.queue];
    this.queue = [];
    items.forEach(item => {
      item.reject(new Error('Navigation queue cleared'));
    });
    logger.warn(LOG_SOURCE, 'Navigation queue cleared', { clearedItems: items.length });
  }

  /**
   * Get queue status (for debugging)
   */
  getStatus(): { queueLength: number; isProcessing: boolean; hasRef: boolean } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      hasRef: this.navigationRef !== null,
    };
  }
}

// Singleton instance
export const navigationQueue = new NavigationQueue();
