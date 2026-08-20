/**
 * UI状态管理Hooks
 * 提供常用的UI状态管理功能
 */

import { useState, useCallback } from 'react';

/**
 * 模态框状态管理
 */
interface ModalState<T = unknown> {
  open: boolean;
  data?: T;
}

export function useModal<T = unknown>() {
  const [state, setState] = useState<ModalState<T>>({
    open: false,
    data: undefined,
  });

  const open = useCallback((data?: T) => {
    setState({ open: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ open: false, data: undefined });
  }, []);

  const isOpen = state.open;

  return {
    isOpen,
    data: state.data,
    open,
    close,
    setState,
  };
}

/**
 * 抽屉状态管理
 */
export function useDrawer<T = unknown>(defaultOpen: boolean = false) {
  const [open, setOpen] = useState(defaultOpen);
  const [data, setData] = useState<T | undefined>(undefined);

  const openDrawer = useCallback((data?: T) => {
    setData(data);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    setData(undefined);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return {
    open,
    data,
    openDrawer,
    closeDrawer,
    toggle,
    setOpen,
  };
}

/**
 * 标签页状态管理
 */
export function useTabs(initialValue?: string) {
  const [value, setValue] = useState<string | undefined>(initialValue);

  const onChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return { value, onChange, setValue: onChange, reset };
}

/**
 * 折叠面板状态管理
 */
export function useCollapse(initialState: boolean = false) {
  const [collapsed, setCollapsed] = useState(initialState);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
  }, []);

  const collapse = useCallback(() => {
    setCollapsed(true);
  }, []);

  return { collapsed, toggle, expand, collapse, setCollapsed };
}

/**
 * 选择状态管理
 */
export function useSelection<T = string>() {
  const [selected, setSelected] = useState<T[]>([]);

  const select = useCallback((item: T) => {
    setSelected((prev) => [...prev, item]);
  }, []);

  const deselect = useCallback((item: T) => {
    setSelected((prev) => prev.filter((i) => i !== item));
  }, []);

  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      if (prev.includes(item)) {
        return prev.filter((i) => i !== item);
      }
      return [...prev, item];
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelected(items);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const isSelected = useCallback((item: T) => selected.includes(item), [selected]);

  return {
    selected,
    setSelected,
    select,
    deselect,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  };
}

/**
 * 排序状态管理
 */
export type SortOrder = 'asc' | 'desc' | undefined;

interface SortState {
  field: string | undefined;
  order: SortOrder;
}

export function useSort(initialField?: string, initialOrder: SortOrder = 'asc') {
  const [sort, setSort] = useState<SortState>({
    field: initialField,
    order: initialOrder,
  });

  const toggleSort = useCallback((field: string) => {
    setSort((prev) => {
      if (prev.field === field) {
        if (prev.order === 'asc') {
          return { field, order: 'desc' };
        }
        if (prev.order === 'desc') {
          return { field: undefined, order: undefined };
        }
      }
      return { field, order: 'asc' };
    });
  }, []);

  const setSortField = useCallback((field: string) => {
    setSort((prev) => ({ ...prev, field }));
  }, []);

  const setSortOrder = useCallback((order: SortOrder) => {
    setSort((prev) => ({ ...prev, order }));
  }, []);

  const resetSort = useCallback(() => {
    setSort({ field: initialField, order: initialOrder });
  }, [initialField, initialOrder]);

  return {
    field: sort.field,
    order: sort.order,
    toggleSort,
    setSortField,
    setSortOrder,
    resetSort,
    setSort,
  };
}

/**
 * 筛选状态管理
 */
export function useFilter<F extends Record<string, unknown>>(initialFilters?: F) {
  const [filters, setFilters] = useState<F>(initialFilters || ({} as F));

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback(<K extends keyof F>(key: K) => {
    setFilters((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest as F;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters || ({} as F));
  }, [initialFilters]);

  const hasFilters = Object.keys(filters).length > 0;

  return {
    filters,
    setFilters,
    setFilter,
    removeFilter,
    resetFilters,
    hasFilters,
  };
}

/**
 * 加载状态管理
 */
export function useLoading(initialState: boolean = false) {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const withLoading = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, setLoading, startLoading, stopLoading, withLoading };
}

/**
 * 消息提示状态管理
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 3000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      return addToast({ type: 'success', message, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      return addToast({ type: 'error', message, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      return addToast({ type: 'warning', message, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      return addToast({ type: 'info', message, duration });
    },
    [addToast]
  );

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
