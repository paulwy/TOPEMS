import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { debounce, throttle } from '../function';

describe('function utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debounce', () => {
    it('should delay execution until wait time has elapsed', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      debounced('b');
      debounced('c');

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('should reset timer on repeated calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      vi.advanceTimersByTime(50);
      debounced('second');
      vi.advanceTimersByTime(99);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });

    it('should call with latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 50);

      debounced(1);
      debounced(2);
      debounced(3);

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });

    it('should handle multiple arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 30);

      debounced('x', 1, true);
      vi.advanceTimersByTime(30);

      expect(fn).toHaveBeenCalledWith('x', 1, true);
    });

    it('should allow multiple debounced runs', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 30);

      debounced('run1');
      vi.advanceTimersByTime(30);
      expect(fn).toHaveBeenCalledTimes(1);

      debounced('run2');
      vi.advanceTimersByTime(30);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not call if wait is zero but followed by another call', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 0);

      debounced('a');
      debounced('b');
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('b');
    });
  });

  describe('throttle', () => {
    it('should call immediately on first invocation', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });

    it('should ignore calls within limit window', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('a');
      throttled('b');
      throttled('c');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('a');

      vi.advanceTimersByTime(99);
      throttled('d');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow next call after limit window expires', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled('second');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should not call again within the same window', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 50);

      throttled(1);
      throttled(2);
      vi.advanceTimersByTime(49);
      throttled(3);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      throttled(4);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple arguments', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 30);

      throttled('x', 2, false);
      expect(fn).toHaveBeenCalledWith('x', 2, false);
    });

    it('should throttle rapid successive calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 10);

      for (let i = 0; i < 10; i++) {
        throttled(i);
      }
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(10);
      throttled(100);
      expect(fn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(10);
      throttled(200);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
