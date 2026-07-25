import { logger } from '@/utils/logger';

export interface ErrorContext {
  moduleId?: string;
  componentName?: string;
  url?: string;
  userAction?: string;
  timestamp?: number;
  extra?: Record<string, unknown>;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  type: string;
  moduleId?: string;
  componentName?: string;
  context: ErrorContext;
  timestamp: number;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ErrorStats {
  totalErrors: number;
  totalErrorTypes: number;
  errorsByModule: Record<string, number>;
  errorsByType: Record<string, number>;
  recentErrors: TrackedError[];
  topErrors: TrackedError[];
}

const STORAGE_KEY = 'microfrontend_error_tracker';
const MAX_ERRORS = 100;

function generateErrorId(error: Error, moduleId?: string): string {
  const message = error.message || 'Unknown error';
  const type = error.name || 'Error';
  return `${moduleId || 'global'}:${type}:${message.substring(0, 100)}`;
}

class ErrorTracker {
  private errors: Map<string, TrackedError> = new Map();
  private isTracking = false;
  private errorHandler: ((event: ErrorEvent) => void) | null = null;
  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;
  private moduleErrorContexts: Map<string, ErrorContext> = new Map();

  startErrorTracking(): void {
    if (this.isTracking || typeof window === 'undefined') return;

    this.errorHandler = (event: ErrorEvent) => {
      const error = event.error || new Error(event.message);
      this.captureError(error, {
        url: event.filename,
        extra: {
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureError(error, {
        extra: {
          isUnhandledRejection: true,
          reason,
        },
      });
    };

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
    this.isTracking = true;

    logger.info('[ErrorTracker] 错误追踪已启动');
  }

  stopErrorTracking(): void {
    if (!this.isTracking || typeof window === 'undefined') return;

    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
      this.errorHandler = null;
    }
    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }

    this.isTracking = false;
    logger.info('[ErrorTracker] 错误追踪已停止');
  }

  setModuleErrorContext(moduleId: string, context: ErrorContext): void {
    this.moduleErrorContexts.set(moduleId, context);
  }

  clearModuleErrorContext(moduleId: string): void {
    this.moduleErrorContexts.delete(moduleId);
  }

  captureError(error: Error | string, context: ErrorContext = {}): TrackedError {
    const err = error instanceof Error ? error : new Error(error);
    const moduleId = context.moduleId || this.detectModuleFromError(err);
    const moduleContext = moduleId ? this.moduleErrorContexts.get(moduleId) : undefined;

    const errorId = generateErrorId(err, moduleId);
    const existing = this.errors.get(errorId);

    const tracked: TrackedError = {
      id: errorId,
      message: err.message,
      stack: err.stack,
      type: err.name || 'Error',
      moduleId,
      componentName: context.componentName || moduleContext?.componentName,
      context: {
        ...moduleContext,
        ...context,
        timestamp: context.timestamp || Date.now(),
      },
      timestamp: Date.now(),
      count: existing ? existing.count + 1 : 1,
      firstSeen: existing?.firstSeen || Date.now(),
      lastSeen: Date.now(),
    };

    this.errors.set(errorId, tracked);
    this.trimErrors();
    this.persistToStorage();

    logger.error(`[ErrorTracker] ${moduleId || 'global'}: ${err.message}`);

    return tracked;
  }

  getErrorStats(): ErrorStats {
    const allErrors = Array.from(this.errors.values());
    const errorsByModule: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    allErrors.forEach((err) => {
      const moduleKey = err.moduleId || 'global';
      errorsByModule[moduleKey] = (errorsByModule[moduleKey] || 0) + err.count;
      errorsByType[err.type] = (errorsByType[err.type] || 0) + err.count;
    });

    const sortedByTime = [...allErrors].sort((a, b) => b.lastSeen - a.lastSeen);
    const sortedByCount = [...allErrors].sort((a, b) => b.count - a.count);

    return {
      totalErrors: allErrors.reduce((sum, e) => sum + e.count, 0),
      totalErrorTypes: allErrors.length,
      errorsByModule,
      errorsByType,
      recentErrors: sortedByTime.slice(0, 20),
      topErrors: sortedByCount.slice(0, 10),
    };
  }

  getModuleErrors(moduleId: string): TrackedError[] {
    return Array.from(this.errors.values())
      .filter((err) => err.moduleId === moduleId)
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  clearErrors(moduleId?: string): void {
    if (moduleId) {
      const keysToDelete: string[] = [];
      this.errors.forEach((err, key) => {
        if (err.moduleId === moduleId) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.errors.delete(key));
    } else {
      this.errors.clear();
    }
    this.persistToStorage();
  }

  private detectModuleFromError(error: Error): string | undefined {
    if (!error.stack) return undefined;

    const stackLines = error.stack.split('\n');
    for (const line of stackLines) {
      const match = line.match(/topems_(\w+)/);
      if (match) {
        return `topems_${match[1]}`;
      }
    }

    return undefined;
  }

  private trimErrors(): void {
    if (this.errors.size <= MAX_ERRORS) return;

    const sorted = Array.from(this.errors.values()).sort((a, b) => a.lastSeen - b.lastSeen);

    const toRemove = sorted.slice(0, sorted.length - MAX_ERRORS);
    toRemove.forEach((err) => this.errors.delete(err.id));
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.errors.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as TrackedError[];
        parsed.forEach((err) => {
          this.errors.set(err.id, err);
        });
      }
    } catch {
      // ignore
    }
  }
}

export const errorTracker = new ErrorTracker();

export default errorTracker;
