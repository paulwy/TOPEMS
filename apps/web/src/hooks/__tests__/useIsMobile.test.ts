import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile, useDeviceType } from '../useIsMobile';

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false for desktop viewport', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should return true for mobile viewport', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should return false when width equals breakpoint', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should respond to custom breakpoint', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
    const { result } = renderHook(() => useIsMobile(1024));
    expect(result.current).toBe(true);
  });

  it('should update on resize event', () => {
    const innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get');
    innerWidthSpy.mockReturnValue(1200);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    innerWidthSpy.mockReturnValue(500);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIsMobile());
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('useDeviceType', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return desktop for large viewport', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('desktop');
  });

  it('should return tablet for medium viewport', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('tablet');
  });

  it('should return mobile for small viewport', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('mobile');
  });

  it('should return tablet when width equals tablet breakpoint', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(768);
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('tablet');
  });

  it('should return desktop when width equals desktop breakpoint', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('desktop');
  });

  it('should update on resize event', () => {
    const innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get');
    innerWidthSpy.mockReturnValue(1200);

    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('desktop');

    innerWidthSpy.mockReturnValue(800);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('tablet');

    innerWidthSpy.mockReturnValue(500);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe('mobile');
  });

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useDeviceType());
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});