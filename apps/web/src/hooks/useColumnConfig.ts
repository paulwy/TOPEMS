/**
 * 表格列配置管理 hook
 *
 * 支持 localStorage 持久化 + URL 同步，用于表格列的显示/隐藏、顺序调整。
 * URL 同步模式下可实现：链接分享自动恢复列配置、前进后退可感知。
 *
 * URL 参数格式：?cols=id,name,status,createdAt（逗号分隔的列 ID 列表，顺序即显示顺序，未出现的列即隐藏）
 *
 * @example
 * ```tsx
 * const { visibleColumns, columnOrder, toggleColumn, reorderColumn, resetColumns } = useColumnConfig({
 *   storageKey: 'users-list',
 *   defaultColumns: columns,
 *   urlSync: 'replace',
 *   urlPrefix: 'users_',
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnConfig } from '@/components/templates/list/types';

interface UseColumnConfigOptions {
  /** localStorage 存储 key，同时作为 URL 参数名（默认 cols）的后缀变体 */
  storageKey?: string;
  /** 默认列配置（从 columns 中提取的可见列 ID 列表） */
  defaultColumnIds?: string[];
  /** 完整的列定义（用于计算默认值） */
  defaultColumns?: ColumnConfig[];
  /**
   * URL 同步模式：
   * - `false`（默认）：仅 localStorage 持久化
   * - `'replace'`：同步到 URL，replace 模式
   * - `'push'`：同步到 URL，push 模式
   */
  urlSync?: false | 'replace' | 'push';
  /** URL 参数前缀，默认空 */
  urlPrefix?: string;
}

interface UseColumnConfigResult {
  /** 可见列的 ID，按顺序排列 */
  visibleColumnIds: string[];
  /** 切换列的可见性 */
  toggleColumn: (columnId: string) => void;
  /** 设置列是否可见 */
  setColumnVisible: (columnId: string, visible: boolean) => void;
  /** 重新排序列（拖拽后调用） */
  reorderColumns: (orderedIds: string[]) => void;
  /** 重置为默认配置 */
  resetColumns: () => void;
  /** 所有列的可见性映射（id -> visible） */
  columnVisibility: Record<string, boolean>;
}

function getDefaultIds(
  defaultColumnIds: string[],
  defaultColumns: ColumnConfig[] | undefined
): string[] {
  if (defaultColumnIds.length > 0) return defaultColumnIds;
  if (defaultColumns) {
    return defaultColumns.filter((c) => c.visible !== false).map((c) => c.id);
  }
  return [];
}

function loadFromStorage(key: string): string[] | null {
  try {
    const stored = localStorage.getItem(`listpage:${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(key: string, ids: string[]) {
  try {
    localStorage.setItem(`listpage:${key}`, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function useColumnConfig(options: UseColumnConfigOptions = {}): UseColumnConfigResult {
  const {
    storageKey,
    defaultColumnIds = [],
    defaultColumns,
    urlSync = false,
    urlPrefix = '',
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const colsParam = urlPrefix ? `${urlPrefix}cols` : 'cols';
  const internalUpdateRef = useRef(false);

  const defaults = getDefaultIds(defaultColumnIds, defaultColumns);

  // 初始值优先级：URL > localStorage > 默认值
  const getInitialVisibleIds = (): string[] => {
    if (urlSync) {
      const fromUrl = searchParams.get(colsParam);
      if (fromUrl) {
        const ids = fromUrl
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0) return ids;
      }
    }
    if (storageKey) {
      const fromStorage = loadFromStorage(storageKey);
      if (fromStorage && fromStorage.length > 0) return fromStorage;
    }
    return defaults;
  };

  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(getInitialVisibleIds);

  // 计算可见性映射
  const columnVisibility = visibleColumnIds.reduce(
    (acc, id) => {
      acc[id] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );

  // 写入 URL
  const updateUrl = useCallback(
    (ids: string[]) => {
      if (!urlSync) return;
      internalUpdateRef.current = true;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (ids.length === 0 || ids.join(',') === defaults.join(',')) {
            next.delete(colsParam);
          } else {
            next.set(colsParam, ids.join(','));
          }
          return next;
        },
        { replace: urlSync === 'replace' }
      );
      requestAnimationFrame(() => {
        internalUpdateRef.current = false;
      });
    },
    [urlSync, setSearchParams, colsParam, defaults]
  );

  // 写入 localStorage
  const persist = useCallback(
    (ids: string[]) => {
      if (storageKey) {
        saveToStorage(storageKey, ids);
      }
      updateUrl(ids);
    },
    [storageKey, updateUrl]
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumnIds((prev) => {
        const next = prev.includes(columnId)
          ? prev.filter((id) => id !== columnId)
          : [...prev, columnId];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setColumnVisible = useCallback(
    (columnId: string, visible: boolean) => {
      setVisibleColumnIds((prev) => {
        const has = prev.includes(columnId);
        if (visible === has) return prev;
        const next = visible ? [...prev, columnId] : prev.filter((id) => id !== columnId);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reorderColumns = useCallback(
    (orderedIds: string[]) => {
      setVisibleColumnIds(orderedIds);
      persist(orderedIds);
    },
    [persist]
  );

  const resetColumns = useCallback(() => {
    setVisibleColumnIds(defaults);
    persist(defaults);
  }, [defaults, persist]);

  const searchParamsString = searchParams.toString();
  // 监听 URL 变化（前进/后退），同步回内部状态
  useEffect(() => {
    if (!urlSync || internalUpdateRef.current) return;
    const fromUrl = searchParams.get(colsParam);
    if (fromUrl) {
      const ids = fromUrl
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0 && ids.join(',') !== visibleColumnIds.join(',')) {
        setVisibleColumnIds(ids);
        if (storageKey) saveToStorage(storageKey, ids);
      }
    } else if (visibleColumnIds.join(',') !== defaults.join(',')) {
      // URL 中没有 cols 参数，恢复 localStorage 或默认值
      const fromStorage = storageKey ? loadFromStorage(storageKey) : null;
      const target = fromStorage && fromStorage.length > 0 ? fromStorage : defaults;
      setVisibleColumnIds(target);
    }
  }, [
    searchParamsString,
    colsParam,
    defaults,
    searchParams,
    storageKey,
    urlSync,
    visibleColumnIds,
  ]);

  return {
    visibleColumnIds,
    toggleColumn,
    setColumnVisible,
    reorderColumns,
    resetColumns,
    columnVisibility,
  };
}

export default useColumnConfig;
