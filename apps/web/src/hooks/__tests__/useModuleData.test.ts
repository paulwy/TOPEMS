/**
 * useModuleData hook — 跨模块数据获取测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useModuleData } from '../useModuleData';

// Access the mock
import { usePlugins, _mockIsPluginInstalled } from '@/context/PluginContext';

// We re-mock PluginContext per test to control isPluginInstalled
vi.mock('@/context/PluginContext', () => {
  const mockFn = vi.fn();
  return {
    usePlugins: () => ({ isPluginInstalled: mockFn }),
    PluginProvider: ({ children }: { children: React.ReactNode }) => children,
    _mockIsPluginInstalled: mockFn,
  };
});
const mockIsPluginInstalled = _mockIsPluginInstalled as unknown as ReturnType<typeof vi.fn>;

describe('useModuleData', () => {
  const mockFetchFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPluginInstalled.mockReturnValue(true);
    mockFetchFn.mockResolvedValue({ items: [1, 2, 3] });
  });

  it('should return null data when plugin is not installed', async () => {
    mockIsPluginInstalled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'finance',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(false);
    });
    expect(result.current.data).toBeNull();
    expect(mockFetchFn).not.toHaveBeenCalled();
  });

  it('should call fetchFn when plugin is installed', async () => {
    mockIsPluginInstalled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'finance',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchFn).toHaveBeenCalled();
    expect(result.current.data).toEqual({ items: [1, 2, 3] });
  });

  it('should handle fetch errors', async () => {
    mockIsPluginInstalled.mockReturnValue(true);
    mockFetchFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'crm',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should support refetch', async () => {
    mockIsPluginInstalled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useModuleData({
        moduleCode: 'wms',
        fetchFn: mockFetchFn,
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [1, 2, 3] });
    });

    const callCount = mockFetchFn.mock.calls.length;

    // Trigger refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFetchFn.mock.calls.length).toBeGreaterThan(callCount);
    });
  });

  it('should not auto-fetch when autoFetch is false', () => {
    mockIsPluginInstalled.mockReturnValue(true);

    renderHook(() =>
      useModuleData({
        moduleCode: 'hrm',
        fetchFn: mockFetchFn,
        autoFetch: false,
      })
    );

    expect(mockFetchFn).not.toHaveBeenCalled();
  });
});
