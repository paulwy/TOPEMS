import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedValue, useDebouncedCallback } from '../useDebounce';

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

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial');

    await vi.advanceTimersByTimeAsync(500);
    expect(result.current).toBe('updated');
  });

  it('should reset timer when value changes before delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'first', delay: 500 });
    await vi.advanceTimersByTimeAsync(300);
    rerender({ value: 'second', delay: 500 });
    await vi.advanceTimersByTimeAsync(300);
    expect(result.current).toBe('initial');

    await vi.advanceTimersByTimeAsync(200);
    expect(result.current).toBe('second');
  });
});

describe('useDebouncedValue', () => {
  it('should behave the same as useDebounce', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    await vi.advanceTimersByTimeAsync(500);
    expect(result.current).toBe('updated');
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

    act(() => {
      result.current.debouncedFn('arg1');
    });

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(callback).toHaveBeenCalledWith('arg1');
  });

  it('should call callback only once for rapid invocations', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => ({
      debouncedFn: useDebouncedCallback(callback, 500),
    }));

    act(() => {
      result.current.debouncedFn('arg1');
      result.current.debouncedFn('arg2');
      result.current.debouncedFn('arg3');
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('arg3');
  });

  it('should use latest callback', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { callback: callback1, delay: 500 } }
    );

    act(() => {
      result.current.debouncedFn('arg1');
    });

    rerender({ callback: callback2, delay: 500 });

    act(() => {
      result.current.debouncedFn('arg2');
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith('arg2');
  });
});