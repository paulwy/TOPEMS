import { describe, it, expect, vi } from 'vitest';
import { batchOperation } from '../batchOperation';

describe('batchOperation performance', () => {
  it('should process 100 items in less than 5 seconds with concurrency of 5', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const mockDelay = 50;
    const operation = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, mockDelay));
      return true;
    });

    const startTime = performance.now();
    await batchOperation(items, operation, { concurrency: 5 });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000);
    expect(operation).toHaveBeenCalledTimes(100);
  });

  it('should process 100 items in less than 3 seconds with concurrency of 10', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const mockDelay = 50;
    const operation = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, mockDelay));
      return true;
    });

    const startTime = performance.now();
    await batchOperation(items, operation, { concurrency: 10 });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(3000);
    expect(operation).toHaveBeenCalledTimes(100);
  });

  it('should maintain reasonable performance with mixed success/failure', async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const mockDelay = 50;
    const operation = vi.fn(async (item) => {
      await new Promise((resolve) => setTimeout(resolve, mockDelay));
      return item % 3 !== 0;
    });

    const startTime = performance.now();
    const result = await batchOperation(items, operation, { concurrency: 5 });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000);
    expect(result.successCount).toBe(66);
    expect(result.failureCount).toBe(34);
  });

  it('should handle 200 items efficiently', async () => {
    const items = Array.from({ length: 200 }, (_, i) => i);
    const mockDelay = 30;
    const operation = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, mockDelay));
      return true;
    });

    const startTime = performance.now();
    await batchOperation(items, operation, { concurrency: 10 });
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(8000);
    expect(operation).toHaveBeenCalledTimes(200);
  });
});
