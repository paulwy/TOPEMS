import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@topems/shared-hooks';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should return debounced value after delay', async () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');

    await vi.advanceTimersByTimeAsync(500);
    expect(result.current).toBe('initial');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce callback execution', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => ({
      debouncedFn: useDebouncedCallback(callback, 500),
    }));

    result.current.debouncedFn('arg1');
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should call callback only once for rapid invocations', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => ({
      debouncedFn: useDebouncedCallback(callback, 500),
    }));

    result.current.debouncedFn('arg1');
    result.current.debouncedFn('arg2');
    result.current.debouncedFn('arg3');

    await vi.advanceTimersByTimeAsync(500);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });
});
