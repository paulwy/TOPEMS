import { useState, useRef, useEffect, useCallback } from 'react';

export interface PendingAction<T = unknown> {
  onClick: (selectedRows: T[]) => void;
  label: string;
}

export interface UseListPageMiscOptions {
  defaultExpandedIds?: Array<string | number>;
  columnConfigStorageKey?: string;
  columnConfigurable?: boolean;
  resolvedColumns?: Array<{ id: string; visible?: boolean; order?: number }>;
  defaultColumnConfig?: Array<{ id: string; visible: boolean; order?: number; label?: string }>;
  persistColumnConfig?: boolean;
  loadColumnConfig?: (key: string) => Array<{ id: string; visible: boolean; order?: number; label?: string }>;
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
    defaultColumnConfig = [],
    persistColumnConfig = false,
    loadColumnConfig,
  } = options;

  // ============ 列配置状态 ============
  const [columnConfig, setColumnConfig] = useState<Array<{ id: string; visible: boolean; label?: string; order?: number }>>([]);
  const columnConfigInitialized = useRef(false);

  // 初始化 columnConfig（使用 resolvedColumns，支持 crud 自动生成的列）
  useEffect(() => {
    if (columnConfigInitialized.current) return;
    if (!columnConfigurable) return;

    // 1. defaultColumnConfig 优先
    if (defaultColumnConfig.length > 0) {
      setColumnConfig(defaultColumnConfig);
      columnConfigInitialized.current = true;
      return;
    }

    // 2. 从 localStorage 加载
    if (persistColumnConfig && loadColumnConfig) {
      const stored = loadColumnConfig(columnConfigStorageKey);
      if (stored.length > 0) {
        setColumnConfig(stored);
        columnConfigInitialized.current = true;
        return;
      }
    }

    // 3. 用 resolvedColumns 初始化
    const cols = resolvedColumns || [];
    setColumnConfig(
      cols.map((col, index) => ({
        id: col.id,
        visible: true,
        order: col.order ?? index,
      }))
    );
    columnConfigInitialized.current = true;
  }, [columnConfigurable, defaultColumnConfig, persistColumnConfig, loadColumnConfig, columnConfigStorageKey, resolvedColumns]);

  // ============ 确认对话框 ============
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction<T> | null>(null);

  // ============ 展开状态 ============
  const [expandedIds, setExpandedIds] = useState<Array<string | number>>(defaultExpandedIds);

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

  // ============ 导出状态 ============
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  // ============ 移动端菜单状态 ============
  const [mobileMenuEl, setMobileMenuEl] = useState<HTMLElement | null>(null);

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
    // 导出状态
    exporting,
    setExporting,
    exportComplete,
    setExportComplete,
    exportAnchorEl,
    setExportAnchorEl,
    // 移动端菜单
    mobileMenuEl,
    setMobileMenuEl,
  };
}
