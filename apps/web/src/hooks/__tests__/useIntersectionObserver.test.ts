import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIntersectionObserver, useInView } from '../useIntersectionObserver';

const createMockEntry = (isIntersecting: boolean, intersectionRatio: number = 0.5) => ({
  isIntersecting,
  intersectionRatio,
  target: document.createElement('div'),
  boundingClientRect: { top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 },
  rootBounds: null,
  intersectionRect: { top: 0, left: 0, width: 100, height: 100, bottom: 100, right: 100 },
  time: 0,
});

describe('useIntersectionObserver', () => {
  let observeSpy: vi.SpyInstance;
  let disconnectSpy: vi.SpyInstance;
  let mockObserverCallback: ((entries: IntersectionObserverEntry[]) => void) | undefined;
  let observerId = 0;

  beforeEach(() => {
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();
    observerId = 0;

    vi.stubGlobal('IntersectionObserver', function (this: unknown, callback: (entries: IntersectionObserverEntry[]) => void) {
      mockObserverCallback = callback;
      return {
        observe: observeSpy,
        disconnect: disconnectSpy,
        unobserve: vi.fn(),
        takeRecords: vi.fn().mockReturnValue([]),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockObserverCallback = undefined;
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.intersectionRatio).toBe(0);
    expect(result.current.entry).toBe(null);
    expect(typeof result.current.ref).toBe('function');
  });

  it('should initialize with custom initial value', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ initialIsIntersecting: true })
    );

    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.intersectionRatio).toBe(0);
    expect(result.current.entry).toBe(null);
  });

  it('should start observing when ref is set', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });

    expect(observeSpy).toHaveBeenCalledWith(element);
  });

  it('should stop observing when ref is cleared', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });
    expect(observeSpy).toHaveBeenCalled();

    act(() => {
      result.current.ref(null);
    });
    expect(disconnectSpy).toHaveBeenCalled();
    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.entry).toBe(null);
  });

  it('should update state when element intersects', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });

    const mockEntry = createMockEntry(true, 0.8);
    act(() => {
      mockObserverCallback?.([mockEntry]);
    });

    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.intersectionRatio).toBe(0.8);
  });

  it('should update state when element stops intersecting', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });

    act(() => {
      mockObserverCallback?.([createMockEntry(true, 0.8)]);
    });
    expect(result.current.isIntersecting).toBe(true);

    act(() => {
      mockObserverCallback?.([createMockEntry(false, 0)]);
    });
    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.intersectionRatio).toBe(0);
  });

  it('should disconnect on unmount', () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });

    unmount();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});

describe('useInView', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', function () {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
        takeRecords: vi.fn().mockReturnValue([]),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current.isIntersecting).toBe(false);
    expect(typeof result.current.ref).toBe('function');
  });
});