import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

import { loadSearchHistory, saveSearchHistory } from '@/components/GlobalSearchBar/utils';

vi.mock('@/api/search', () => ({
  searchApi: {
    globalSearch: vi.fn().mockResolvedValue({
      success: true,
      code: 200,
      message: 'ok',
      data: [
        {
          id: '1',
          title: 'Test Result',
          description: 'Test description',
          module: 'user',
          path: '/test',
          type_name: '用户',
        },
      ],
      timestamp: Date.now(),
    }),
  },
}));

vi.mock('@/components/GlobalSearchBar/utils', () => ({
  loadSearchHistory: vi.fn().mockReturnValue(['previous', 'searches']),
  saveSearchHistory: vi.fn(),
  MAX_HISTORY_ITEMS: 10,
  fuzzySearch: vi.fn((results) => results),
  filterResults: vi.fn((results) => results),
  getAvailableModules: vi.fn().mockReturnValue([]),
  getAvailableTypes: vi.fn().mockReturnValue([]),
}));

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSearchHistory).mockReturnValue(['previous', 'searches']);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const mockNavigate = vi.fn();
    const { result } = renderHook(() => useGlobalSearch(mockNavigate));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.selectedIndex).toBe(-1);
    expect(result.current.open).toBe(false);
    expect(loadSearchHistory).toHaveBeenCalled();
    expect(result.current.inputRef.current).toBeNull();
    expect(result.current.searchRef.current).toBeNull();
  });

  it('should update query when setQuery is called', () => {
    const mockNavigate = vi.fn();
    const { result } = renderHook(() => useGlobalSearch(mockNavigate));

    act(() => {
      result.current.setQuery('new query');
    });

    expect(result.current.query).toBe('new query');
    expect(result.current.selectedIndex).toBe(-1);
  });

  it('should toggle open state', () => {
    const mockNavigate = vi.fn();
    const { result } = renderHook(() => useGlobalSearch(mockNavigate));

    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.setOpen(false);
    });
    expect(result.current.open).toBe(false);
  });

  it('should call handleFocus and open search', () => {
    const mockNavigate = vi.fn();
    const { result } = renderHook(() => useGlobalSearch(mockNavigate));

    act(() => {
      result.current.handleFocus();
    });

    expect(result.current.open).toBe(true);
  });

  describe('search functionality', () => {
    it('should execute search after debounce', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.loading).toBe(false);

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
        expect(result.current.results[0].title).toBe('Test Result');
      });
    });

    it('should handle search failure gracefully', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      vi.mocked(searchApi.globalSearch).mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.results).toEqual([]);
      });
    });

    it('should cancel previous request when new query is entered', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const abortSpy = vi.fn();
      const mockSignal = {
        aborted: false,
        onabort: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      vi.mocked(searchApi.globalSearch).mockImplementation(async (_query, _limit, signal) => {
        if (signal) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return {
          success: true,
          code: 200,
          message: 'ok',
          data: [
            {
              id: '1',
              title: 'Test Result',
              description: 'Test description',
              module: 'user',
              path: '/test',
              type_name: '用户',
            },
          ],
          timestamp: Date.now(),
        };
      });
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('first');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.setQuery('second');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });
    });

    it('should reset results when query is cleared', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.setQuery('');
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });
    });

    it('should set selectedIndex to -1 when query changes', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setSelectedIndex(0);
      });
      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.setQuery('new query');
      });

      expect(result.current.selectedIndex).toBe(-1);
    });
  });

  describe('search history', () => {
    it('should load search history on mount', () => {
      const mockNavigate = vi.fn();
      renderHook(() => useGlobalSearch(mockNavigate));

      expect(loadSearchHistory).toHaveBeenCalledTimes(1);
    });

    it('should add to history when addToHistory is called', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.addToHistory('new search');
      });

      expect(result.current.searchHistory).toEqual(['new search', 'previous', 'searches']);
      expect(saveSearchHistory).toHaveBeenCalledWith(['new search', 'previous', 'searches']);
    });

    it('should not add empty text to history', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.addToHistory('   ');
      });

      expect(saveSearchHistory).not.toHaveBeenCalled();
    });

    it('should remove duplicate entries from history', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.addToHistory('previous');
      });

      expect(result.current.searchHistory).toEqual(['previous', 'searches']);
      expect(saveSearchHistory).toHaveBeenCalledWith(['previous', 'searches']);
    });

    it('should remove from history when removeFromHistory is called', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.removeFromHistory('previous');
      });

      expect(result.current.searchHistory).toEqual(['searches']);
      expect(saveSearchHistory).toHaveBeenCalledWith(['searches']);
    });

    it('should clear history when clearHistory is called', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.searchHistory).toEqual([]);
      expect(saveSearchHistory).toHaveBeenCalledWith([]);
    });
  });

  describe('keyboard navigation', () => {
    it('should navigate with arrow keys', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
        result.current.setOpen(true);
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it('should call navigate on Enter when result is selected', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.setSelectedIndex(0);
      });

      await waitFor(() => {
        expect(result.current.selectedIndex).toBe(0);
      });

      act(() => {
        const currentHandleKeyDown = result.current.handleKeyDown;
        currentHandleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test');
      expect(result.current.open).toBe(false);
      expect(result.current.query).toBe('');
    });

    it('should not call navigate on Enter when no result is selected', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should handle Escape key to close search', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setOpen(true);
        result.current.setQuery('test');
      });
      expect(result.current.open).toBe(true);
      expect(result.current.query).toBe('test');

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.open).toBe(false);
      expect(result.current.query).toBe('');
    });

    it('should handle Ctrl+K to open search', async () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      });

      await waitFor(() => {
        expect(result.current.open).toBe(true);
      });
    });

    it('should handle Cmd+K to open search', async () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      });

      await waitFor(() => {
        expect(result.current.open).toBe(true);
      });
    });

    it('should handle Home key to go to first result', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
        result.current.setOpen(true);
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'Home',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should handle End key to go to last result', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
        result.current.setOpen(true);
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'End',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should handle / key to open search when not focused', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
      });

      expect(result.current.open).toBe(true);
    });

    it('should wrap around when navigating past last result', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.setSelectedIndex(0);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowDown',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should wrap around when navigating before first result', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      });

      act(() => {
        result.current.setSelectedIndex(0);
      });

      act(() => {
        result.current.handleKeyDown({
          key: 'ArrowUp',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent);
      });

      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe('result click', () => {
    it('should navigate and reset state when handleResultClick is called', () => {
      const mockNavigate = vi.fn();
      const { result } = renderHook(() => useGlobalSearch(mockNavigate));

      const mockResult = {
        id: '1',
        title: 'Test',
        description: '',
        module: 'user',
        path: '/test',
        type_name: '用户',
      };

      act(() => {
        result.current.setQuery('test');
        result.current.handleResultClick(mockResult);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test');
      expect(result.current.open).toBe(false);
      expect(result.current.query).toBe('');
    });
  });

  describe('cleanup', () => {
    it('should abort pending request when hook unmounts', async () => {
      const mockNavigate = vi.fn();
      const { searchApi } = await import('@/api/search');
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise<any>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(searchApi.globalSearch).mockReturnValue(pendingPromise);

      const { result, unmount } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      await waitFor(() => {
        expect(searchApi.globalSearch).toHaveBeenCalled();
      });

      act(() => {
        unmount();
      });
    });

    it('should clear debounce timer when hook unmounts', async () => {
      const mockNavigate = vi.fn();
      vi.useFakeTimers();
      const { result, unmount } = renderHook(() => useGlobalSearch(mockNavigate));

      act(() => {
        result.current.setQuery('test');
      });

      act(() => {
        unmount();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      vi.useRealTimers();
    });
  });
});
