import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useIntersectionObserver,
  useInView,
  type UseIntersectionObserverOptions,
} from '../useIntersectionObserver';

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let lastCallback: ObserverCallback | null = null;
let lastOptions: IntersectionObserverInit | null = null;
const mockCalls: {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

function lastInstance() {
  return mockCalls[mockCalls.length - 1];
}

class MockIntersectionObserver {
  callback: ObserverCallback;
  options: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords: ReturnType<typeof vi.fn>;

  constructor(callback: ObserverCallback, options: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    this.takeRecords = vi.fn().mockReturnValue([]);
    mockCalls.push({ observe: this.observe, disconnect: this.disconnect });
    lastCallback = callback;
    lastOptions = options;
  }
}

function simulateEntry(entry: Partial<IntersectionObserverEntry>) {
  if (!lastCallback) throw new Error('No observer callback registered');
  lastCallback([entry]);
}

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as any);
    lastCallback = null;
    lastOptions = null;
    mockCalls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should return initial state before ref is assigned', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.intersectionRatio).toBe(0);
    expect(result.current.entry).toBeNull();
    expect(typeof result.current.ref).toBe('function');
  });

  it('should use initialIsIntersecting when provided', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ initialIsIntersecting: true })
    );
    expect(result.current.isIntersecting).toBe(true);
  });

  it('should create observer when ref is called with element', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement('div');

    act(() => {
      result.current.ref(element);
    });

    expect(lastInstance().observe).toHaveBeenCalledWith(element);
  });

  it('should disconnect previous observer when ref is reassigned', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');

    act(() => result.current.ref(el1));
    const firstObserver = lastInstance();
    expect(firstObserver.observe).toHaveBeenCalledWith(el1);

    act(() => result.current.ref(el2));
    expect(firstObserver.disconnect).toHaveBeenCalled();
    expect(lastInstance().observe).toHaveBeenCalledWith(el2);
  });

  it('should reset state when ref is set to null', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ initialIsIntersecting: true })
    );

    const entry: Partial<IntersectionObserverEntry> = {
      isIntersecting: true,
      intersectionRatio: 0.5,
      target: document.createElement('div'),
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: 0,
    };

    const el = document.createElement('div');
    act(() => result.current.ref(el));
    act(() => simulateEntry(entry));
    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.intersectionRatio).toBe(0.5);

    act(() => result.current.ref(null));
    expect(result.current.isIntersecting).toBe(true); // matches initialIsIntersecting
    expect(result.current.intersectionRatio).toBe(0);
    expect(result.current.entry).toBeNull();
  });

  it('should update state when observer callback fires', () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const el = document.createElement('div');

    act(() => result.current.ref(el));

    act(() =>
      simulateEntry({
        isIntersecting: true,
        intersectionRatio: 0.9,
        target: el,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: 1,
      })
    );

    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.intersectionRatio).toBe(0.9);
    expect(result.current.entry).not.toBeNull();
  });

  it('should stop observing after trigger once triggerOnce=true', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ triggerOnce: true })
    );
    const el = document.createElement('div');

    act(() => result.current.ref(el));
    const obs = lastInstance();
    act(() =>
      simulateEntry({
        isIntersecting: true,
        intersectionRatio: 1,
        target: el,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: 0,
      })
    );

    expect(obs.disconnect).toHaveBeenCalled();
    expect(result.current.isIntersecting).toBe(true);
  });

  it('triggerOnce: should not create new observer after triggered', () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ triggerOnce: true })
    );
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');

    act(() => result.current.ref(el1));
    const obsBefore = mockCalls.length;
    act(() =>
      simulateEntry({
        isIntersecting: true,
        intersectionRatio: 1,
        target: el1,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: 0,
      })
    );
    act(() => result.current.ref(el2));
    // No new observer should be created after once triggered
    expect(mockCalls.length).toBe(obsBefore);
  });

  it('should pass threshold, root, rootMargin options to observer', () => {
    const options: UseIntersectionObserverOptions = {
      threshold: [0, 0.5, 1],
      rootMargin: '10px',
    };
    const { result } = renderHook(() => useIntersectionObserver(options));
    const element = document.createElement('div');
    act(() => result.current.ref(element));

    expect(lastOptions?.threshold).toEqual([0, 0.5, 1]);
    expect(lastOptions?.rootMargin).toBe('10px');
  });

  it('should disconnect on unmount', () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver());
    const el = document.createElement('div');
    act(() => result.current.ref(el));
    const obs = lastInstance();

    unmount();
    expect(obs.disconnect).toHaveBeenCalled();
  });
});

describe('useInView', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as any);
    lastCallback = null;
    mockCalls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should behave like useIntersectionObserver with triggerOnce=true', () => {
    const { result } = renderHook(() => useInView());
    const el = document.createElement('div');

    act(() => result.current.ref(el));
    const obs = lastInstance();
    act(() =>
      simulateEntry({
        isIntersecting: true,
        intersectionRatio: 0.3,
        target: el,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: {} as DOMRectReadOnly,
        time: 0,
      })
    );

    expect(obs.disconnect).toHaveBeenCalled();
    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.intersectionRatio).toBe(0.3);
  });
});
