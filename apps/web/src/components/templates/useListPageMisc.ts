import { useState, useRef, useEffect, useCallback } from 'react';

export interface PendingAction<T = unknown> {
  onClick: (selectedRows: T[]) => void;
  label: string;
}

export interface UseListPageMiscOptions {
  defaultExpandedIds?: Array<string | number>;
  columnConfigStorageKey?: string;
  columnConfigurable?: boolean;
  resolvedColumns?: Array<{ id: string; label?: string; visible?: boolean }>;
}

/**
 * ListPage 其他状态管理 hook（展开 / 列配置 / 确认对话框）
 * 从 ListPageTemplate 抽出，保持 API 兼容
 */
export function useListPageMisc<T = unknown>(options: UseListPageMiscOptions = {}) {
  const {
    defaultExpandedIds = [],
    columnConfigStorageKey = 'default',
    columnConfigurable = false,
    resolvedColumns = [],
  } = options;

  // ============ 确认对话框 ============
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction<T> | null>(null);

  // ============ 展开状态 ============
  const [expandedIds, setExpandedIds] = useState<Array<string | number>>(defaultExpandedIds);

  // ============ 列配置状态 ============
  const [columnConfig, setColumnConfig] = useState<Array<{ id: string; visible: boolean; label?: string }>>([]);
  const columnConfigInitialized = useRef(false);

  // 初始化 columnConfig
  useEffect(() => {
    if (columnConfigInitialized.current) return;
    if (!columnConfigurable || resolvedColumns.length === 0) return;

    // 从 localStorage 加载
    try {
      const stored = localStorage.getItem(`listpage:columnConfig:${columnConfigStorageKey}`);
      if (stored) {
        setColumnConfig(JSON.parse(stored));
        columnConfigInitialized.current = true;
        return;
      }
    } catch {
      // ignore
    }

    // 用 resolvedColumns 初始化
    setColumnConfig(
      resolvedColumns.map((col) => ({
        id: col.id,
        visible: col.visible !== false,
        label: col.label,
      }))
    );
    columnConfigInitialized.current = true;
  }, [columnConfigurable, resolvedColumns, columnConfigStorageKey]);

  // ============ 动作 ============
  const openConfirmDialog = useCallback((action: PendingAction<T>) => {
    setPendingAction(action);
    setConfirmDialogOpen(true);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingAction(null);
  }, []);

  const toggleExpand = useCallback((id: string | number) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setColumnConfig((prev) => {
        const next = prev.map((col) =>
          col.id === columnId ? { ...col, visible: !col.visible } : col
        );
        // 持久化
        try {
          localStorage.setItem(
            `listpage:columnConfig:${columnConfigStorageKey}`,
            JSON.stringify(next)
          );
        } catch {
          // ignore
        }
        return next;
      });
    },
    [columnConfigStorageKey]
  );

  return {
    // 确认对话框
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAction,
    setPendingAction,
    openConfirmDialog,
    closeConfirmDialog,
    // 展开状态
    expandedIds,
    setExpandedIds,
    toggleExpand,
    // 列配置
    columnConfig,
    setColumnConfig,
    toggleColumnVisibility,
  };
}
