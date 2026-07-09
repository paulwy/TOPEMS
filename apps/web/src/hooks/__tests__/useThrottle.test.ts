import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottle, useThrottledCallback } from '../useThrottle';

describe('useThrottle', () => {
  it('should return initial value', () => {
    const { result } = renderHook(() => useThrottle('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should not update if value has not changed', async () => {
    vi.useFakeTimers();
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => vi.getTimerCount());

    const { result, rerender } = renderHook(({ value }) => useThrottle(value, 500), {
      initialProps: { value: 'same' },
    });

    expect(result.current).toBe('same');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ value: 'same' });
    expect(result.current).toBe('same');

    nowSpy.mockRestore();
    vi.useRealTimers();
  });
});

describe('useThrottledCallback', () => {
  it('should pass arguments to callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(callback, 500));

    result.current('arg1', 'arg2');

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });
});
