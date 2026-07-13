import { apiLogger } from './logger';

export interface BatchOperationOptions<T = any> {
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
  onComplete?: (successCount: number, failureCount: number, failures: T[]) => void;
  signal?: AbortSignal;
  onItemStart?: (item: T, index: number) => void;
  onItemSuccess?: (item: T, index: number) => void;
  onItemFailure?: (item: T, index: number, error?: unknown) => void;
  preValidation?: (items: T[]) => { valid: T[]; invalid: T[]; reason?: string };
  operationName?: string;
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: ((error: unknown) => boolean) | undefined;
  onBeforeOperation?: (items: T[]) => Promise<void> | void;
  onAfterOperation?: (results: BatchOperationResult<T>) => Promise<void> | void;
  consistencyCheck?: (item: T, original: T) => boolean;
}

export interface BatchOperationResult<T = any> {
  successCount: number;
  failureCount: number;
  cancelledCount: number;
  preValidationFailedCount: number;
  successes: T[];
  failures: T[];
  cancelled: T[];
  preValidationFailed: T[];
  retriedItems: T[];
}

const DEFAULT_RETRYABLE_ERRORS = (error: unknown): boolean => {
  const axiosError = error as {
    response?: { status: number };
    code?: string;
    message?: string;
  };

  if (axiosError.code === 'ERR_NETWORK') {
    return true;
  }

  if (
    axiosError.code === 'ECONNABORTED' ||
    (axiosError.message && axiosError.message.includes('timeout'))
  ) {
    return true;
  }

  const status = axiosError.response?.status;
  if (status && (status >= 500 || status === 429)) {
    return true;
  }

  return false;
};

const executeWithRetry = async <T = any>(
  item: T,
  index: number,
  signal: AbortSignal | undefined,
  operation: (item: T, index: number, signal?: AbortSignal) => Promise<boolean | void>,
  maxRetries: number,
  retryDelay: number,
  retryableErrors: ((error: unknown) => boolean)
): Promise<{ success: boolean; cancelled: boolean; item: T; retried: boolean; error?: unknown }> => {
  let attempts = 0;
  let lastError: unknown;

  while (attempts <= maxRetries) {
    if (signal?.aborted) {
      return { success: false, cancelled: true, item, retried: false };
    }

    try {
      const result = await operation(item, index, signal);
      return { success: result !== false, cancelled: false, item, retried: attempts > 0 };
    } catch (error: unknown) {
      lastError = error;

      if (signal?.aborted) {
        return { success: false, cancelled: true, item, retried: attempts > 0 };
      }

      if (attempts >= maxRetries || !retryableErrors(error)) {
        return { success: false, cancelled: false, item, retried: attempts > 0, error };
      }

      attempts++;
      apiLogger.warn(`[Batch Operation] Retrying item ${index + 1}, attempt ${attempts} of ${maxRetries + 1}`, {
        itemIndex: index,
        attempts,
        maxRetries,
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
    }
  }

  return { success: false, cancelled: false, item, retried: attempts > 0, error: lastError };
};

export async function batchOperation<T = any>(
  items: T[],
  operation: (item: T, index: number, signal?: AbortSignal) => Promise<boolean | void>,
  options: BatchOperationOptions<T> = {}
): Promise<BatchOperationResult<T>> {
  const {
    concurrency = 5,
    onProgress,
    onComplete,
    signal,
    onItemStart,
    onItemSuccess,
    onItemFailure,
    preValidation,
    operationName = 'batch-operation',
    maxRetries = 0,
    retryDelay = 1000,
    retryableErrors = DEFAULT_RETRYABLE_ERRORS,
    onBeforeOperation,
    onAfterOperation,
    consistencyCheck,
  } = options;

  const results: BatchOperationResult<T> = {
    successCount: 0,
    failureCount: 0,
    cancelledCount: 0,
    preValidationFailedCount: 0,
    successes: [],
    failures: [],
    cancelled: [],
    preValidationFailed: [],
    retriedItems: [],
  };

  const originalItems = [...items];
  const total = items.length;
  let processed = 0;
  const startTime = performance.now();

  apiLogger.info(`[Batch Operation] ${operationName} started, total items: ${total}`, {
    operationName,
    totalItems: total,
    concurrency,
    maxRetries,
    retryDelay,
    timestamp: new Date().toISOString(),
  });

  try {
    if (onBeforeOperation) {
      await onBeforeOperation(items);
    }

    if (preValidation) {
      const validationResult = preValidation(items);
      if (validationResult.invalid.length > 0) {
        results.preValidationFailed = validationResult.invalid;
        results.preValidationFailedCount = validationResult.invalid.length;
        apiLogger.warn(`[Batch Operation] ${operationName} pre-validation failed`, {
          operationName,
          invalidCount: validationResult.invalid.length,
          reason: validationResult.reason,
        });
      }
      items = validationResult.valid;
    }

    const executeInBatches = async () => {
      if (signal?.aborted) {
        items.forEach((item) => {
          results.cancelledCount++;
          results.cancelled.push(item);
        });
        return;
      }

      const batches: T[][] = [];
      for (let i = 0; i < items.length; i += concurrency) {
        batches.push(items.slice(i, i + concurrency));
      }

      for (const batch of batches) {
        if (signal?.aborted) {
          batch.forEach((item) => {
            results.cancelledCount++;
            results.cancelled.push(item);
          });
          break;
        }

        const batchResults = await Promise.allSettled(
          batch.map(async (item, localIndex) => {
            const globalIndex = items.indexOf(item);
            onItemStart?.(item, globalIndex);

            const result = await executeWithRetry(
              item,
              globalIndex,
              signal,
              operation,
              maxRetries,
              retryDelay,
              retryableErrors
            );

            if (result.retried) {
              results.retriedItems.push(item);
            }

            if (result.cancelled) {
              return { success: false, cancelled: true, item };
            }

            if (result.success) {
              if (consistencyCheck && originalItems[globalIndex]) {
                const isConsistent = consistencyCheck(item, originalItems[globalIndex]);
                if (!isConsistent) {
                  apiLogger.warn(`[Batch Operation] Consistency check failed for item ${globalIndex + 1}`, {
                    operationName,
                    itemIndex: globalIndex,
                  });
                }
              }
              onItemSuccess?.(item, globalIndex);
              return { success: true, item };
            }

            onItemFailure?.(item, globalIndex, result.error);
            return { success: false, item, error: result.error };
          })
        );

        batchResults.forEach((result) => {
          processed++;
          if (result.status === 'fulfilled') {
            if (result.value.cancelled) {
              results.cancelledCount++;
              results.cancelled.push(result.value.item);
            } else if (result.value.success) {
              results.successCount++;
              results.successes.push(result.value.item);
            } else {
              results.failureCount++;
              results.failures.push(result.value.item);
              apiLogger.error(`[Batch Operation] Item ${processed} failed`, {
                operationName,
                itemIndex: processed,
                error: result.value.error instanceof Error ? result.value.error.message : String(result.value.error),
              });
            }
          } else {
            results.failureCount++;
            apiLogger.error(`[Batch Operation] Item ${processed} rejected`, {
              operationName,
              itemIndex: processed,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }

          onProgress?.(processed, total);
        });
      }
    };

    await executeInBatches();
  } catch (error: unknown) {
    apiLogger.error(`[Batch Operation] ${operationName} error boundary caught error`, {
      operationName,
      error: error instanceof Error ? error.message : String(error),
      processed,
      total,
      timestamp: new Date().toISOString(),
    });
  } finally {
    const endTime = performance.now();
    const duration = endTime - startTime;

    apiLogger.info(`[Batch Operation] ${operationName} completed`, {
      operationName,
      totalItems: total,
      successCount: results.successCount,
      failureCount: results.failureCount,
      cancelledCount: results.cancelledCount,
      preValidationFailedCount: results.preValidationFailedCount,
      retriedCount: results.retriedItems.length,
      durationMs: duration.toFixed(2),
      avgTimePerItem: total > 0 ? (duration / total).toFixed(2) : 'N/A',
      timestamp: new Date().toISOString(),
    });

    if (onAfterOperation) {
      try {
        await onAfterOperation(results);
      } catch (afterError: unknown) {
        apiLogger.error(`[Batch Operation] ${operationName} onAfterOperation failed`, {
          operationName,
          error: afterError instanceof Error ? afterError.message : String(afterError),
        });
      }
    }

    onComplete?.(results.successCount, results.failureCount, results.failures);
  }

  return results;
}

export function createBatchAbortController(): AbortController {
  return new AbortController();
}