import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import { createSafeLazy, lazyWithPreload } from '../createSafeLazy';
import { logger } from '../logger';

// ── Capture the async factory passed to React.lazy ────────────────────────
let capturedFactory: (() => Promise<{ default: unknown }>) | null = null;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const mockLazy = vi.fn((factory: () => Promise<{ default: unknown }>) => {
    capturedFactory = factory;
    return { $$typeof: Symbol.for('react.lazy') } as never;
  });
  return {
    ...actual,
    default: {
      ...actual.default,
      lazy: mockLazy,
    },
    lazy: mockLazy,
  };
});

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

describe('utils/createSafeLazy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFactory = null;
  });

  it('calls React.lazy and returns a lazy component', () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} as never });
    const result = createSafeLazy(importFn);
    expect(React.lazy).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('successfully resolves the module from importFn', async () => {
    const mod = { default: { name: 'MyComponent' } };
    createSafeLazy(() => Promise.resolve(mod));

    const result = await capturedFactory!();
    expect(result).toBe(mod);
  });

  it('on import failure: logs error and returns a fallback-rendering component', async () => {
    const fallback = <div>Failed to load component</div>;
    createSafeLazy(() => Promise.reject(new Error('chunk load error')), { fallback });

    const result = await capturedFactory!();
    expect(logger.error).toHaveBeenCalledWith(
      '[createSafeLazy] Failed to load component:',
      expect.any(Error)
    );
    // The returned default is a render-prop that yields the fallback
    expect(typeof result.default).toBe('function');
    const rendered = (result.default as () => React.ReactNode)();
    expect(React.isValidElement(rendered)).toBe(true);
    expect(rendered).toEqual(fallback);
  });

  it('on import failure with no fallback option: returns null', async () => {
    createSafeLazy(() => Promise.reject(new Error('load failed')));

    const result = await capturedFactory!();
    expect(logger.error).toHaveBeenCalled();
    const rendered = (result.default as () => React.ReactNode)();
    expect(rendered).toBeNull();
  });
});

describe('utils/lazyWithPreload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedFactory = null;
  });

  it('returns both a lazy component and a preload function', () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} as never });
    const { lazy, preload } = lazyWithPreload(importFn);

    expect(lazy).toBeDefined();
    expect(typeof preload).toBe('function');
  });

  it('preload() directly invokes the importFn', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} as never });
    const { preload } = lazyWithPreload(importFn);

    await preload();
    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('preload result is the raw module promise', async () => {
    const mod = { default: { name: 'Preloaded' } };
    const { preload } = lazyWithPreload(() => Promise.resolve(mod));

    const result = await preload();
    expect(result).toBe(mod);
  });

  it('accepts fallback option and forwards to createSafeLazy', async () => {
    const fallback = <span>oops</span>;
    lazyWithPreload(() => Promise.reject(new Error('fail')), { fallback });

    const result = await capturedFactory!();
    const rendered = (result.default as () => React.ReactNode)();
    expect(rendered).toEqual(fallback);
  });
});
