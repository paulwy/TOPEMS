import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVirtualScroll } from '../useVirtualScroll';

describe('useVirtualScroll', () => {
  let resizeObserverSpy: vi.SpyInstance;
  let mockResizeObserver: { observe: vi.SpyInstance; disconnect: vi.SpyInstance };

  beforeEach(() => {
    mockResizeObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };

    resizeObserverSpy = vi.stubGlobal(
      'ResizeObserver',
      function (this: unknown, callback: () => void) {
        return {
          observe: mockResizeObserver.observe,
          disconnect: mockResizeObserver.disconnect,
        };
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should calculate total height correctly', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(result.current.totalHeight).toBe(5000);
  });

  it('should return empty visibleItems when itemCount is 0', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 0, itemHeight: 50 }));

    expect(result.current.visibleItems).toEqual([]);
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.offsetY).toBe(0);
  });

  it('should calculate visible items based on scroll position', () => {
    const { result, rerender } = renderHook(
      ({ scrollTop, containerHeight }) => {
        const containerRef = { current: { clientHeight: containerHeight } };
        const hook = useVirtualScroll({ itemCount: 100, itemHeight: 50 });
        Object.defineProperty(hook.containerRef, 'current', {
          get: () => ({ clientHeight: containerHeight }),
          configurable: true,
        });
        return { ...hook, scrollTop };
      },
      { initialProps: { scrollTop: 0, containerHeight: 300 } }
    );

    expect(result.current.visibleItems.length).toBeGreaterThan(0);
    expect(result.current.visibleItems[0]).toBe(0);
  });

  it('should use default overscan value', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(result.current.containerProps).toBeDefined();
    expect(result.current.innerProps).toBeDefined();
  });

  it('should handle scroll event', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(typeof result.current.handleScroll).toBe('function');
    expect(typeof result.current.containerProps.onScroll).toBe('function');
  });

  it('should return correct containerProps', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(result.current.containerProps.ref).toBe(result.current.containerRef);
    expect(result.current.containerProps.onScroll).toBe(result.current.handleScroll);
    expect(result.current.containerProps.style.overflow).toBe('auto');
    expect(result.current.containerProps.style.position).toBe('relative');
  });

  it('should return correct innerProps', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(result.current.innerProps.style.position).toBe('relative');
    expect(result.current.innerProps.style.height).toBe('5000px');
    expect(result.current.innerProps.style.overflow).toBe('hidden');
  });

  it('should initialize resize observer', () => {
    const { result } = renderHook(() => useVirtualScroll({ itemCount: 100, itemHeight: 50 }));

    expect(mockResizeObserver.disconnect).toBeDefined();
  });

  it('should handle custom overscan value', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({ itemCount: 100, itemHeight: 50, overscan: 10 })
    );

    expect(result.current.containerProps).toBeDefined();
    expect(result.current.innerProps).toBeDefined();
  });
});
