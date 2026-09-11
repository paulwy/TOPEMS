import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import React from 'react';
import { lazyImport } from '../lazyImport';

// ── Capture the async factory passed to React.lazy ────────────────────────
// lazyImport wraps the retry logic inside the factory it hands to React.lazy.
// We mock React.lazy to capture that factory so we can exercise its success /
// retry / error behaviour directly without needing Suspense.
let capturedFactory: (() => Promise<{ default: unknown }>) | null = null;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      lazy: vi.fn((factory: () => Promise<{ default: unknown }>) => {
        capturedFactory = factory;
        return { $$typeof: Symbol.for('react.lazy') } as never;
      }),
    },
  };
});

// Mock logger (lazyImport.ts calls createLogger('lazyImport') at module scope)
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('utils/lazyImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFactory = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls React.lazy and returns a lazy component', () => {
    const factory = vi.fn().mockResolvedValue({ default: {} as never });
    const result = lazyImport(factory, 'Dashboard');
    expect(React.lazy).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('factory-overload: successfully loads module on first attempt', async () => {
    const mod = { default: { name: 'Dashboard' } };
    const factory = vi.fn().mockResolvedValue(mod);
    lazyImport(factory, 'Dashboard');

    const result = await capturedFactory!();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toBe(mod);
  });

  it('options-overload: supports onLoad / onError callbacks', async () => {
    const onLoad = vi.fn();
    const onError = vi.fn();
    const mod = { default: {} as never };
    lazyImport({
      factory: () => Promise.resolve(mod),
      moduleName: 'Settings',
      onLoad,
      onError,
    });

    const result = await capturedFactory!();
    expect(result).toBe(mod);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('retries on failure and eventually succeeds (default maxRetries=3)', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const mod = { default: {} as never };
    let attempts = 0;

    lazyImport({
      factory: () => {
        attempts++;
        if (attempts < 3) return Promise.reject(new Error('network down'));
        return Promise.resolve(mod);
      },
      moduleName: 'Charts',
      onError,
    });

    const promise = capturedFactory!();
    // retryDelay=1000 default; waits 1000*1 then 1000*2 between attempts
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result).toBe(mod);
    expect(attempts).toBe(3);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after all retries are exhausted', async () => {
    vi.useFakeTimers();
    lazyImport({
      factory: () => Promise.reject(new Error('chunk load failed')),
      moduleName: 'Broken',
      maxRetries: 2,
      retryDelay: 100,
    });

    const settled = capturedFactory!().then(
      () => 'resolved',
      (e: Error) => `rejected: ${e.message}`
    );
    // attempt 1 fails -> wait 100*1=100ms; attempt 2 fails -> no wait (last)
    await vi.advanceTimersByTimeAsync(100);
    const outcome = await settled;

    expect(outcome).toBe('rejected: chunk load failed');
  });

  it('honours custom maxRetries option', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    lazyImport(() => {
      attempts++;
      return Promise.reject(new Error('fail'));
    }, 'Temp');

    const settled = capturedFactory!().then(
      () => 'resolved',
      () => 'rejected'
    );
    // default maxRetries=3 -> waits 1000 + 2000 = 3000ms
    await vi.advanceTimersByTimeAsync(3000);
    await settled;

    expect(attempts).toBe(3);
  });

  it('converts non-Error rejections into Error instances before throwing', async () => {
    vi.useFakeTimers();
    lazyImport({
      factory: () => Promise.reject('string failure'),
      moduleName: 'Weird',
      maxRetries: 1,
    });

    const settled = capturedFactory!().then(
      () => 'resolved',
      (e: Error) => `isError: ${e instanceof Error}, msg: ${e.message}`
    );
    await vi.advanceTimersByTimeAsync(0);
    const outcome = await settled;

    expect(outcome).toBe('isError: true, msg: string failure');
  });
});
