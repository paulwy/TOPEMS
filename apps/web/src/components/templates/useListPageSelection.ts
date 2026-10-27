import { useState, useRef, useCallback } from 'react';

export interface BatchOperationState {
  isProcessing: boolean;
  processed: number;
  total: number;
  actionLabel: string;
  isCancelled: boolean;
}

export interface UseListPageSelectionOptions {
  filterStorageKey?: string;
  persistSelection?: boolean;
}

/**
 * ListPage 选中状态管理 hook
 * 从 ListPageTemplate 抽出，保持 API 兼容
 */
export function useListPageSelection<T>(options: UseListPageSelectionOptions = {}) {
  const { filterStorageKey, persistSelection = false } = options;

  // ============ 行操作菜单 ============
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // ============ 批量选择状态 ============
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(() => {
    if (!persistSelection) return new Set();
    const key = filterStorageKey || window.location.pathname;
    try {
      const stored = localStorage.getItem(`listpage:selectedIds:${key}`);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    return new Set();
  });

  // ============ 批量操作状态 ============
  const [batchOperationState, setBatchOperationState] = useState<BatchOperationState>({
    isProcessing: false,
    processed: 0,
    total: 0,
    actionLabel: '',
    isCancelled: false,
  });
  const batchAbortController = useRef<AbortController | null>(null);

  // ============ 动作 ============
  const openRowMenu = useCallback((anchor: HTMLElement, row: T) => {
    setAnchorEl(anchor);
    setSelectedRow(row);
  }, []);

  const closeRowMenu = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
  }, []);

  const toggleSelectAll = useCallback((ids: Array<string | number>, select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
      // 持久化
      if (persistSelection) {
        const key = filterStorageKey || window.location.pathname;
        try {
          localStorage.setItem(`listpage:selectedIds:${key}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [persistSelection, filterStorageKey]);

  const toggleSelectRow = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (persistSelection) {
        const key = filterStorageKey || window.location.pathname;
        try {
          localStorage.setItem(`listpage:selectedIds:${key}`, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, [persistSelection, filterStorageKey]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    if (persistSelection) {
      const key = filterStorageKey || window.location.pathname;
      try {
        localStorage.removeItem(`listpage:selectedIds:${key}`);
      } catch {
        // ignore
      }
    }
  }, [persistSelection, filterStorageKey]);

  return {
    // 行操作菜单
    anchorEl,
    selectedRow,
    setAnchorEl,
    setSelectedRow,
    openRowMenu,
    closeRowMenu,
    // 批量选择
    selectedIds,
    setSelectedIds,
    toggleSelectAll,
    toggleSelectRow,
    clearSelection,
    // 批量操作
    batchOperationState,
    setBatchOperationState,
    batchAbortController,
  };
}
