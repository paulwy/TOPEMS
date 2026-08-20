import { describe, it, expect, vi } from 'vitest';
import { batchOperation } from '../batchOperation';

describe('batchOperation', () => {
  it('should execute operations concurrently', async () => {
    const items = [1, 2, 3, 4, 5];
    const operation = vi.fn(async (item) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return item % 2 === 0;
    });

    const result = await batchOperation(items, operation, { concurrency: 2 });

    expect(operation).toHaveBeenCalledTimes(5);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(3);
    expect(result.successes).toEqual([2, 4]);
    expect(result.failures).toEqual([1, 3, 5]);
  });

  it('should call onProgress callback', async () => {
    const items = [1, 2, 3];
    const operation = vi.fn(async () => true);
    const onProgress = vi.fn();

    await batchOperation(items, operation, { onProgress });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledWith(1, 3);
    expect(onProgress).toHaveBeenCalledWith(2, 3);
    expect(onProgress).toHaveBeenCalledWith(3, 3);
  });

  it('should call onComplete callback', async () => {
    const items = [1, 2];
    const operation = vi.fn(async () => true);
    const onComplete = vi.fn();

    await batchOperation(items, operation, { onComplete });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(2, 0, []);
  });

  it('should handle item lifecycle callbacks', async () => {
    const items = [1, 2];
    const operation = vi.fn(async (item) => item === 1);
    const onItemStart = vi.fn();
    const onItemSuccess = vi.fn();
    const onItemFailure = vi.fn();

    await batchOperation(items, operation, {
      onItemStart,
      onItemSuccess,
      onItemFailure,
    });

    expect(onItemStart).toHaveBeenCalledTimes(2);
    expect(onItemSuccess).toHaveBeenCalledTimes(1);
    expect(onItemSuccess).toHaveBeenCalledWith(1, 0);
    expect(onItemFailure).toHaveBeenCalledTimes(1);
    expect(onItemFailure).toHaveBeenCalledWith(2, 1, undefined);
  });
});

describe('createBatchAbortController', () => {
  it('should create an AbortController', () => {
    const controller = createBatchAbortController();
    expect(controller).toBeInstanceOf(AbortController);
    expect(controller.signal.aborted).toBe(false);
  });

  it('should abort correctly', () => {
    const controller = createBatchAbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });
});
