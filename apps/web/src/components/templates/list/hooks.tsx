import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Chip } from '@mui/material';
import { Edit, Trash2, Plus } from 'lucide-react';
import { logger } from '@/utils/logger';
import { mapListParamsToBackend } from '@/utils/listParamMapping';
import type { UseCrudQueriesResult } from '@/hooks';
import type {
  BatchAction,
  CardViewConfig,
  ColumnConfig,
  ColumnDef,
  ListPageCrudConfig,
  ListPageStateParams,
  ListViewMode,
  RowAction,
} from './types';
import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

/** 内部列表状态结果（传递在各 hook 之间的状态对象） */
export interface InternalListStateResult {
  debouncedSearch: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  filters: Record<string, unknown>;
  setFilters: (filters: Record<string, unknown>) => void;
  searchQuery: string;
}

// ============ useInlineEditing ============

export interface UseInlineEditingParams<T> {
  editingRowIdProp?: string | number | null;
  onEditingRowIdChange?: (id: string | number | null) => void;
  onInlineEditSave?: (row: T, changes: Partial<T>) => Promise<void> | void;
  onInlineEditCancel?: (row: T) => void;
  getRowId?: (row: T) => string | number;
}

export interface UseInlineEditingResult<T> {
  internalEditingRowId: string | number | null;
  editingData: Partial<T> | null;
  resolvedEditingRowId: string | number | null;
  setEditingRowId: (id: string | number | null) => void;
  startEditing: (row: T) => void;
  cancelEditing: (row: T) => void;
  saveEditing: (row: T) => Promise<void>;
  updateEditingField: (field: keyof T, value: unknown) => void;
}

/**
 * 行内编辑 Hook
 * 提供行内编辑状态管理与保存/取消逻辑
 */
export function useInlineEditing<T>({
  editingRowIdProp,
  onEditingRowIdChange,
  onInlineEditSave,
  onInlineEditCancel,
  getRowId,
}: UseInlineEditingParams<T>): UseInlineEditingResult<T> {
  const [internalEditingRowId, setInternalEditingRowId] = useState<string | number | null>(null);
  const [editingData, setEditingData] = useState<Partial<T> | null>(null);
  const resolvedEditingRowId = editingRowIdProp ?? internalEditingRowId;

  const setEditingRowId = useCallback(
    (id: string | number | null) => {
      if (editingRowIdProp === undefined) {
        setInternalEditingRowId(id);
      }
      onEditingRowIdChange?.(id);
    },
    [editingRowIdProp, onEditingRowIdChange]
  );

  const startEditing = useCallback(
    (row: T) => {
      const rowId =
        getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number);
      setEditingData({ ...row } as Partial<T>);
      setEditingRowId(rowId);
    },
    [getRowId, setEditingRowId]
  );

  const cancelEditing = useCallback(
    (row: T) => {
      setEditingData(null);
      setEditingRowId(null);
      onInlineEditCancel?.(row);
    },
    [setEditingRowId, onInlineEditCancel]
  );

  const saveEditing = useCallback(
    async (row: T) => {
      if (!editingData) return;
      const changes = editingData;
      try {
        await onInlineEditSave?.(row, changes);
        setEditingData(null);
        setEditingRowId(null);
      } catch {
        // // Save失败，保持EditStatus
      }
    },
    [editingData, onInlineEditSave, setEditingRowId]
  );

  const updateEditingField = useCallback((field: keyof T, value: unknown) => {
    setEditingData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  return {
    internalEditingRowId,
    editingData,
    resolvedEditingRowId,
    setEditingRowId,
    startEditing,
    cancelEditing,
    saveEditing,
    updateEditingField,
  };
}

// ============ useTreeTable ============

export interface UseTreeTableParams<T> {
  data: T[];
  treeView?: boolean;
  treeChildrenField: string;
  treeNodeKeyField: string;
  defaultExpandedKeys?: (string | number)[];
  expandedKeysProp?: (string | number)[];
  onExpandedKeysChange?: (keys: (string | number)[]) => void;
  resolvedColumns: ColumnDef<T>[];
}

export interface UseTreeTableResult<T> {
  internalExpandedKeys: (string | number)[];
  resolvedExpandedKeys: (string | number)[];
  setExpandedKeys: (keys: (string | number)[]) => void;
  toggleExpand: (key: string | number) => void;
  flatData: Array<{ row: T; level: number; parentKey?: string | number }>;
  treeTableData: T[];
  getRowLevel: (rowId: string | number) => number;
  hasChildren: (row: T) => boolean;
  treeColumnId?: string;
}

/**
 * 树形表格 Hook
 * 提供树形数据的扁平化、展开/折叠管理
 */
export function useTreeTable<T>({
  data,
  treeView,
  treeChildrenField,
  treeNodeKeyField,
  defaultExpandedKeys = [],
  expandedKeysProp,
  onExpandedKeysChange,
  resolvedColumns,
}: UseTreeTableParams<T>): UseTreeTableResult<T> {
  const [internalExpandedKeys, setInternalExpandedKeys] =
    useState<(string | number)[]>(defaultExpandedKeys);
  const resolvedExpandedKeys = expandedKeysProp ?? internalExpandedKeys;

  const setExpandedKeys = useCallback(
    (keys: (string | number)[]) => {
      if (expandedKeysProp === undefined) {
        setInternalExpandedKeys(keys);
      }
      onExpandedKeysChange?.(keys);
    },
    [expandedKeysProp, onExpandedKeysChange]
  );

  const toggleExpand = useCallback(
    (key: string | number) => {
      const isExpanded = resolvedExpandedKeys.includes(key);
      const newKeys = isExpanded
        ? resolvedExpandedKeys.filter((k) => k !== key)
        : [...resolvedExpandedKeys, key];
      setExpandedKeys(newKeys);
    },
    [resolvedExpandedKeys, setExpandedKeys]
  );

  const flatData = useMemo<Array<{ row: T; level: number; parentKey?: string | number }>>(() => {
    if (!treeView) return data.map((row) => ({ row, level: 0 }));
    const result: Array<{ row: T; level: number; parentKey?: string | number }> = [];
    const flatten = (items: T[], level: number, parentKey?: string | number) => {
      items.forEach((item) => {
        const key = (item as unknown as Record<string, unknown>)[treeNodeKeyField] as
          string | number;
        result.push({ row: item, level, parentKey });
        const children = (item as unknown as Record<string, unknown>)[treeChildrenField] as
          T[] | undefined;
        if (children && children.length > 0 && resolvedExpandedKeys.includes(key)) {
          flatten(children, level + 1, key);
        }
      });
    };
    flatten(data, 0);
    return result;
  }, [data, treeView, treeNodeKeyField, treeChildrenField, resolvedExpandedKeys]);

  const treeTableData = useMemo(() => {
    if (!treeView) return data;
    return flatData.map((item) => item.row);
  }, [treeView, flatData, data]);

  const getRowLevel = useCallback(
    (rowId: string | number): number => {
      if (!treeView) return 0;
      const item = flatData.find(
        (f) => (f.row as unknown as Record<string, unknown>)[treeNodeKeyField] === rowId
      );
      return item?.level ?? 0;
    },
    [treeView, flatData, treeNodeKeyField]
  );

  const hasChildren = useCallback(
    (row: T): boolean => {
      if (!treeView) return false;
      const children = (row as unknown as Record<string, unknown>)[treeChildrenField] as
        T[] | undefined;
      return !!(children && children.length > 0);
    },
    [treeView, treeChildrenField]
  );

  const treeColumnId = useMemo(() => {
    const treeCol = resolvedColumns.find((col) => col.treeColumn);
    return treeCol?.id || resolvedColumns[0]?.id;
  }, [resolvedColumns]);

  return {
    internalExpandedKeys,
    resolvedExpandedKeys,
    setExpandedKeys,
    toggleExpand,
    flatData,
    treeTableData,
    getRowLevel,
    hasChildren,
    treeColumnId,
  };
}

// ============ useExportFeature ============

export interface UseExportFeatureParams<T> {
  exportable?: boolean;
  exportFileName?: string;
  exportFormats?: Array<'csv' | 'excel' | 'json'>;
  exportScopes?: Array<'current' | 'all' | 'selected'>;
  exportTransform?: (row: T) => Record<string, unknown>;
  exportColumns?: string[];
  exportIncludeHeader?: boolean;
  crud?: ListPageCrudConfig<T>;
  data: T[];
  visibleColumns: ColumnDef<T>[];
  effectiveSelectedIds: (string | number)[];
  getRowId?: (row: T) => string | number;
}

export interface UseExportFeatureResult {
  resolvedExportable: boolean;
  resolvedExportFileName: string;
  resolvedExportFormats: Array<'csv' | 'excel' | 'json'>;
  resolvedExportScopes: Array<'current' | 'all' | 'selected'>;
  resolvedExportColumns: string[];
  exporting: boolean;
  exportComplete: boolean;
  exportAnchorEl: HTMLElement | null;
  setExportAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  handleExport: (
    format?: 'csv' | 'excel' | 'json',
    scope?: 'current' | 'all' | 'selected'
  ) => Promise<void>;
}

/**
 * 导出功能 Hook
 * 提供导出菜单状态、数据转换与下载逻辑
 */
export function useExportFeature<T>({
  exportable,
  exportFileName,
  exportFormats,
  exportScopes,
  exportTransform,
  exportColumns,
  exportIncludeHeader = true,
  crud,
  data,
  visibleColumns,
  effectiveSelectedIds,
  getRowId,
}: UseExportFeatureParams<T>): UseExportFeatureResult {
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  const resolvedExportable = useMemo(() => {
    if (exportable !== undefined) return exportable;
    if (crud?.exportable) return true;
    return false;
  }, [exportable, crud]);

  const resolvedExportFileName = useMemo(() => {
    if (exportFileName) return exportFileName;
    if (crud?.exportFileName) return crud.exportFileName;
    if (crud?.entityName) return crud.entityName;
    return 'export';
  }, [exportFileName, crud]);

  const resolvedExportFormats = useMemo((): Array<'csv' | 'excel' | 'json'> => {
    if (exportFormats?.length) return exportFormats as Array<'csv' | 'excel' | 'json'>;
    if (crud?.exportFormats?.length) return crud.exportFormats as Array<'csv' | 'excel' | 'json'>;
    return ['csv', 'json'];
  }, [exportFormats, crud]);

  const resolvedExportScopes = useMemo((): Array<'current' | 'all' | 'selected'> => {
    if (exportScopes?.length) return exportScopes as Array<'current' | 'all' | 'selected'>;
    if (crud?.exportScopes?.length)
      return crud.exportScopes as Array<'current' | 'all' | 'selected'>;
    return ['current', 'all', 'selected'];
  }, [exportScopes, crud]);

  const resolvedExportColumns = useMemo(() => {
    if (exportColumns?.length) return exportColumns;
    if (crud?.formFields) {
      return crud.formFields.filter((f) => !f.hideInExport && f.key !== 'id').map((f) => f.key);
    }
    return visibleColumns.map((c) => c.id);
  }, [exportColumns, crud, visibleColumns]);

  const handleExport = useCallback(
    async (
      format: 'csv' | 'excel' | 'json' = 'csv',
      scope: 'current' | 'all' | 'selected' = 'current'
    ) => {
      if (!resolvedExportable || exporting) return;

      try {
        setExporting(true);
        setExportAnchorEl(null);

        let exportDataRows: T[] = [];
        if (scope === 'selected') {
          exportDataRows = data.filter((row) =>
            effectiveSelectedIds.includes(
              getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number)
            )
          );
        } else {
          exportDataRows = data;
        }

        if (exportDataRows.length === 0) {
          logger.warn(t('components.hooks.3b7b2c'));
          setExporting(false);
          return;
        }

        const exportColDefs = resolvedExportColumns.map((colId) => {
          const col = visibleColumns.find((c) => c.id === colId);
          let label = col?.label || col?.header || colId;
          if (crud?.formFields) {
            const field = crud.formFields.find((f) => f.key === colId);
            if (field) label = field.label;
          }
          return { id: colId, label };
        });

        const headers = exportColDefs.map((c) => c.label);

        const transformedRows = exportDataRows.map((row) => {
          const transformed = exportTransform
            ? exportTransform(row)
            : (row as unknown as Record<string, unknown>);
          const result: Record<string, unknown> = {};
          exportColDefs.forEach(({ id }) => {
            let value = transformed[id];
            if (crud?.formFields) {
              const field = crud.formFields.find((f) => f.key === id);
              if (field?.exportFormat) {
                value = field.exportFormat(value, transformed);
              }
            }
            result[id] = value;
          });
          return result;
        });

        let blob: Blob;
        let ext: string;

        if (format === 'json') {
          const jsonContent = JSON.stringify(transformedRows, null, 2);
          blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
          ext = 'json';
        } else {
          const csvRows = transformedRows.map((row) => {
            return exportColDefs
              .map(({ id }) => {
                const value = row[id];
                if (value === null || value === undefined) return '';
                if (typeof value === 'string') {
                  return `"${value.replace(/"/g, '""')}"`;
                }
                if (typeof value === 'object') {
                  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return String(value);
              })
              .join(',');
          });

          const csvContent = exportIncludeHeader
            ? [headers.join(','), ...csvRows].join('\n')
            : csvRows.join('\n');

          blob = new Blob([`\uFEFF${csvContent}`], {
            type:
              format === 'excel'
                ? 'application/vnd.ms-excel;charset=utf-8;'
                : 'text/csv;charset=utf-8;',
          });
          ext = format === 'excel' ? 'xls' : 'csv';
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `${resolvedExportFileName}-${timestamp}.${ext}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportComplete(true);
        setTimeout(() => {
          setExportComplete(false);
        }, 2000);
      } catch (error) {
        logger.error(t('components.hooks.6f3de4b1'), error);
      } finally {
        setExporting(false);
      }
    },
    [
      resolvedExportable,
      data,
      visibleColumns,
      exportTransform,
      exporting,
      resolvedExportFileName,
      resolvedExportColumns,
      exportIncludeHeader,
      crud,
      effectiveSelectedIds,
      getRowId,
    ]
  );

  return {
    resolvedExportable,
    resolvedExportFileName,
    resolvedExportFormats,
    resolvedExportScopes,
    resolvedExportColumns,
    exporting,
    exportComplete,
    exportAnchorEl,
    setExportAnchorEl,
    handleExport,
  };
}

// ============ useColumnConfigState ============

export interface UseColumnConfigStateParams<T> {
  columns: ColumnDef<T>[];
  resolvedColumns: ColumnDef<T>[];
  defaultColumnConfig: ColumnConfig[];
  persistColumnConfig: boolean;
  columnConfigStorageKey: string;
  onColumnConfigChange?: (config: ColumnConfig[]) => void;
  columnConfigProp?: {
    key: string;
    urlSync?: false | 'replace' | 'push';
    urlPrefix?: string;
  };
  // // 外部传入的 useColumnConfig 结果
  columnConfigResult: {
    visibleColumnIds: string[];
    reorderColumns: (ids: string[]) => void;
  };
}

export interface UseColumnConfigStateResult {
  columnConfig: ColumnConfig[];
  setColumnConfig: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  columnConfigAnchor: HTMLElement | null;
  setColumnConfigAnchor: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  handleColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  handleColumnConfigChange: (config: ColumnConfig[]) => void;
  handleResetColumnConfig: () => void;
  urlColSyncEnabled: string | false;
}

/**
 * 列配置状态 Hook
 * 管理列的显示/隐藏、顺序、持久化、URL 同步
 */
export function useColumnConfigState<T>({
  columns,
  resolvedColumns,
  defaultColumnConfig,
  persistColumnConfig,
  columnConfigStorageKey,
  onColumnConfigChange,
  columnConfigProp,
  columnConfigResult,
}: UseColumnConfigStateParams<T>): UseColumnConfigStateResult {
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);
  const [columnConfigAnchor, setColumnConfigAnchor] = useState<HTMLElement | null>(null);

  const urlColSyncEnabled = !!(columnConfigProp?.urlSync && columnConfigProp.key);

  const columnConfigInitialized = useRef(false);
  useEffect(() => {
    if (columnConfigInitialized.current) return;
    if (defaultColumnConfig.length > 0) {
      setColumnConfig(defaultColumnConfig);
      columnConfigInitialized.current = true;
      return;
    }
    if (persistColumnConfig) {
      try {
        const stored = JSON.parse(
          localStorage.getItem(`listpage:${columnConfigStorageKey}`) || '[]'
        );
        if (Array.isArray(stored) && stored.length > 0) {
          setColumnConfig(stored);
          columnConfigInitialized.current = true;
          return;
        }
      } catch {
        // ignore
      }
    }
    const cols = resolvedColumns || [];
    setColumnConfig(
      cols.map((col, index) => ({
        id: col.id,
        visible: true,
        order: col.order ?? index,
      }))
    );
    columnConfigInitialized.current = true;
  }, [resolvedColumns, defaultColumnConfig, persistColumnConfig, columnConfigStorageKey]);

  const visibleIdsFromConfig = (cfg: ColumnConfig[]): string[] => {
    return [...cfg]
      .filter((c) => c.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => c.id);
  };

  // // 从 URL/useColumnConfig 同步到内部 columnConfig state（URL Priority最High）
  useEffect(() => {
    if (!urlColSyncEnabled) return;
    const urlIds = columnConfigResult.visibleColumnIds;
    if (urlIds.length === 0) return;
    const currentIds = visibleIdsFromConfig(columnConfig);
    if (urlIds.join(',') === currentIds.join(',')) return;

    setColumnConfig((prev) => {
      const result: ColumnConfig[] = [];
      urlIds.forEach((id, idx) => {
        result.push({ id, visible: true, order: idx });
      });
      const hiddenCols = prev.filter((c) => !urlIds.includes(c.id));
      hiddenCols.forEach((c, idx) => {
        result.push({ ...c, visible: false, order: urlIds.length + idx });
      });
      return result;
    });
  }, [columnConfigResult.visibleColumnIds]);

  // // 内部 columnConfig 变化时同步回 useColumnConfig（写 URL 和 localStorage）
  useEffect(() => {
    if (!urlColSyncEnabled) return;
    const ids = visibleIdsFromConfig(columnConfig);
    if (ids.join(',') !== columnConfigResult.visibleColumnIds.join(',')) {
      columnConfigResult.reorderColumns(ids);
    }
  }, [columnConfig]);

  // // 列Configuration持久化到 localStorage
  useEffect(() => {
    if (persistColumnConfig && !urlColSyncEnabled) {
      try {
        localStorage.setItem(`listpage:${columnConfigStorageKey}`, JSON.stringify(columnConfig));
      } catch {
        // ignore
      }
    }
  }, [columnConfig, persistColumnConfig, columnConfigStorageKey, urlColSyncEnabled]);

  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      const newConfig = columnConfig.map((col) =>
        col.id === columnId ? { ...col, visible } : col
      );
      setColumnConfig(newConfig);
      onColumnConfigChange?.(newConfig);
    },
    [columnConfig, onColumnConfigChange]
  );

  const handleColumnConfigChange = useCallback(
    (config: ColumnConfig[]) => {
      setColumnConfig(config);
      onColumnConfigChange?.(config);
    },
    [onColumnConfigChange]
  );

  const handleResetColumnConfig = useCallback(() => {
    const defaultConfig = columns.map((col, index) => ({
      id: col.id,
      visible: true,
      order: col.order ?? index,
    }));
    setColumnConfig(defaultConfig);
    onColumnConfigChange?.(defaultConfig);
    setColumnConfigAnchor(null);
  }, [columns, onColumnConfigChange]);

  return {
    columnConfig,
    setColumnConfig,
    columnConfigAnchor,
    setColumnConfigAnchor,
    handleColumnVisibilityChange,
    handleColumnConfigChange,
    handleResetColumnConfig,
    urlColSyncEnabled: urlColSyncEnabled ? columnConfigProp!.key : false,
  };
}

// ============ useBatchOperations ============

export interface UseBatchOperationsParams<T> {
  data: T[];
  getRowId: (row: T) => string | number;
  filterStorageKey?: string;
  isBatchSelectionEnabled: boolean;
  effectiveSelectedIds: (string | number)[];
  effectiveOnSelectionChange?: (ids: (string | number)[]) => void;
}

export interface UseBatchOperationsResult<T> {
  selectedIds: Set<string | number>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  handleBatchSelect: (row: T, event?: React.MouseEvent) => void;
  handleBatchSelectAll: () => void;
  getSelectedRows: () => T[];
  confirmDialogOpen: boolean;
  pendingAction: { onClick: (selectedRows: T[]) => void; label: string } | null;
  setPendingAction: React.Dispatch<
    React.SetStateAction<{ onClick: (selectedRows: T[]) => void; label: string } | null>
  >;
  setConfirmDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleBatchAction: (action: {
    onClick: (selectedRows: T[]) => void;
    label: string;
    confirm?: boolean;
    confirmMessage?: string;
  }) => void;
  handleConfirmBatchAction: () => void;
  handleCancelConfirm: () => void;
  batchOperationState: {
    isProcessing: boolean;
    processed: number;
    total: number;
    actionLabel: string;
    isCancelled: boolean;
  };
  handleCancelBatchOperation: () => void;
  updateBatchProgress: (processed: number, total: number) => void;
  batchAbortController: React.MutableRefObject<AbortController | null>;
}

/**
 * 批量操作 Hook
 * 管理批量选择、确认对话框、进度状态
 */
export function useBatchOperations<T>({
  data,
  getRowId,
  filterStorageKey,
  isBatchSelectionEnabled,
}: UseBatchOperationsParams<T>): UseBatchOperationsResult<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(() => {
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

  const [batchOperationState, setBatchOperationState] = useState<{
    isProcessing: boolean;
    processed: number;
    total: number;
    actionLabel: string;
    isCancelled: boolean;
  }>({
    isProcessing: false,
    processed: 0,
    total: 0,
    actionLabel: '',
    isCancelled: false,
  });

  const batchAbortController = useRef<AbortController | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    onClick: (selectedRows: T[]) => void;
    label: string;
  } | null>(null);

  // // 批量SelectStatus持久化
  useEffect(() => {
    const key = filterStorageKey || window.location.pathname;
    try {
      localStorage.setItem(`listpage:selectedIds:${key}`, JSON.stringify([...selectedIds]));
    } catch {
      // ignore
    }
  }, [selectedIds, filterStorageKey]);

  const handleBatchSelect = useCallback(
    (row: T, _event?: React.MouseEvent) => {
      const rowId = getRowId(row);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    },
    [getRowId]
  );

  const handleBatchSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(data.map((row) => getRowId(row)));
      setSelectedIds(allIds);
    }
  }, [selectedIds.size, data, getRowId]);

  // // 键盘快捷键 Ctrl/Cmd + A 全选
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        const target = event.target as HTMLElement;
        const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
        if (isBatchSelectionEnabled && !isInput) {
          event.preventDefault();
          handleBatchSelectAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatchSelectionEnabled, handleBatchSelectAll]);

  const getSelectedRows = useCallback(() => {
    return data.filter((row) => selectedIds.has(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const handleBatchAction = useCallback(
    (action: {
      onClick: (selectedRows: T[]) => void;
      label: string;
      confirm?: boolean;
      confirmMessage?: string;
    }) => {
      const rows = getSelectedRows();
      if (action.confirm !== false) {
        setPendingAction({ onClick: action.onClick, label: action.label });
        setConfirmDialogOpen(true);
      } else {
        action.onClick(rows);
        setSelectedIds(new Set());
      }
    },
    [getSelectedRows]
  );

  const handleConfirmBatchAction = useCallback(() => {
    if (pendingAction) {
      const rows = getSelectedRows();
      batchAbortController.current = new AbortController();
      setBatchOperationState({
        isProcessing: true,
        processed: 0,
        total: rows.length,
        actionLabel: pendingAction.label,
        isCancelled: false,
      });
      pendingAction.onClick(rows);
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  }, [pendingAction, getSelectedRows]);

  const handleCancelBatchOperation = useCallback(() => {
    batchAbortController.current?.abort();
    setBatchOperationState((prev) => ({ ...prev, isCancelled: true }));
  }, []);

  const handleCancelConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
    setPendingAction(null);
  }, []);

  const updateBatchProgress = useCallback((processed: number, total: number) => {
    setBatchOperationState((prev) => ({
      ...prev,
      processed,
      total,
      isProcessing: processed < total,
    }));
    if (processed >= total) {
      setSelectedIds(new Set());
    }
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    handleBatchSelect,
    handleBatchSelectAll,
    getSelectedRows,
    confirmDialogOpen,
    pendingAction,
    setPendingAction,
    setConfirmDialogOpen,
    handleBatchAction,
    handleConfirmBatchAction,
    handleCancelConfirm,
    batchOperationState,
    handleCancelBatchOperation,
    updateBatchProgress,
    batchAbortController,
  };
}

// ============ useCrudForm ============

export interface UseCrudFormParams<T extends { id?: string | number }> {
  crud?: ListPageCrudConfig<T>;
  getRowId?: (row: T) => string | number;
  crudResult: UseCrudQueriesResult<T>;
  formMode: 'create' | 'edit' | 'view';
  setFormMode: (mode: 'create' | 'edit' | 'view') => void;
  currentRecord: T | null;
  setCurrentRecord: (record: T | null) => void;
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  formSubmitting: boolean;
  setFormSubmitting: (submitting: boolean) => void;
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export interface UseCrudFormResult<T extends { id?: string | number }> {
  buildInitialFormData: (mode: 'create' | 'edit' | 'view', record?: T) => Record<string, unknown>;
  openCreateForm: () => void;
  openEditForm: (record: T) => void;
  openViewForm: (record: T) => void;
  handleDelete: (record: T) => Promise<boolean>;
  closeForm: () => void;
  handleFormSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  validateForm: () => boolean;
  handleAutoFormSubmit: () => Promise<boolean>;
  renderAutoForm: () => React.ReactNode;
  formContent: React.ReactNode;
  hasForm: boolean;
}

/**
 * CRUD 表单 Hook
 * 管理表单状态、验证、提交、自动渲染
 */
export function useCrudForm<T extends { id?: string | number }>({
  crud,
  getRowId,
  crudResult,
  formMode,
  setFormMode,
  currentRecord,
  setCurrentRecord,
  formOpen,
  setFormOpen,
  formSubmitting,
  setFormSubmitting,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
}: UseCrudFormParams<T>): UseCrudFormResult<T> {
  const buildInitialFormData = useCallback(
    (mode: 'create' | 'edit' | 'view', record?: T): Record<string, unknown> => {
      if (!crud?.formFields) return {};
      const data: Record<string, unknown> = {};
      crud.formFields.forEach((field) => {
        if (mode === 'create' && field.hideInCreate) return;
        if (mode === 'edit' && field.hideInEdit) return;
        if (mode === 'view' && field.hideInView) return;
        if (record && (record as Record<string, unknown>)[field.key] !== undefined) {
          data[field.key] = (record as Record<string, unknown>)[field.key];
        } else {
          data[field.key] = field.defaultValue ?? (field.type === 'switch' ? false : '');
        }
      });
      return data;
    },
    [crud]
  );

  const openCreateForm = useCallback(() => {
    setCurrentRecord(null);
    setFormMode('create');
    setFormData(buildInitialFormData('create'));
    setFormErrors({});
    setFormOpen(true);
  }, [
    buildInitialFormData,
    setCurrentRecord,
    setFormMode,
    setFormData,
    setFormErrors,
    setFormOpen,
  ]);

  const openEditForm = useCallback(
    (record: T) => {
      setCurrentRecord(record);
      setFormMode('edit');
      setFormData(buildInitialFormData('edit', record));
      setFormErrors({});
      setFormOpen(true);
    },
    [buildInitialFormData, setCurrentRecord, setFormMode, setFormData, setFormErrors, setFormOpen]
  );

  const openViewForm = useCallback(
    (record: T) => {
      setCurrentRecord(record);
      setFormMode('view');
      setFormData(buildInitialFormData('view', record));
      setFormErrors({});
      setFormOpen(true);
    },
    [buildInitialFormData, setCurrentRecord, setFormMode, setFormData, setFormErrors, setFormOpen]
  );

  const handleDelete = useCallback(
    async (record: T): Promise<boolean> => {
      if (!crud) return false;
      const rowId = getRowId ? getRowId(record) : (record as Record<string, unknown>).id;
      if (!rowId) return false;
      if (!confirm(i18n.t('components.hooks.k0'))) return false;
      try {
        await crudResult.delete(String(rowId));
        return true;
      } catch {
        return false;
      }
    },
    [crud, crudResult, getRowId]
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
  }, [setFormOpen]);

  const handleFormSubmit = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      if (!crud) return false;
      setFormSubmitting(true);
      try {
        if (formMode === 'create') {
          await crudResult.createMutation.mutateAsync(data as Partial<T>);
        } else if (formMode === 'edit' && currentRecord?.id) {
          await crudResult.updateMutation.mutateAsync({
            id: String(currentRecord.id),
            item: data as Partial<T>,
          });
        }
        setFormOpen(false);
        return true;
      } catch {
        return false;
      } finally {
        setFormSubmitting(false);
      }
    },
    [crud, formMode, currentRecord, crudResult, setFormOpen, setFormSubmitting]
  );

  const validateForm = useCallback((): boolean => {
    if (!crud?.formFields) return true;
    const errors: Record<string, string> = {};
    const visibleFields = crud.formFields.filter((field) => {
      if (formMode === 'create' && field.hideInCreate) return false;
      if (formMode === 'edit' && field.hideInEdit) return false;
      return true;
    });

    visibleFields.forEach((field) => {
      const value = formData[field.key];
      const isRequired = field.required || field.rules?.some((r) => r.type === 'required');
      if (
        isRequired &&
        (value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0))
      ) {
        const rule = field.rules?.find((r) => r.type === 'required');
        errors[field.key] =
          rule?.message || `${field.label}${t('components.components.hooks.key_257ef9')}`;
        return;
      }
      if (value === undefined || value === null || value === '') return;

      if (field.rules) {
        for (const rule of field.rules) {
          if (rule.type === 'required') continue;
          if (rule.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors[field.key] = rule.message || t('components.components.hooks.key_b45b4e');
              break;
            }
          }
          if (rule.type === 'number' && isNaN(Number(value))) {
            errors[field.key] = rule.message || t('components.components.hooks.key_fde53c');
            break;
          }
          if (rule.type === 'min' && Number(value) < (rule.min ?? 0)) {
            errors[field.key] =
              rule.message || `${t('components.components.hooks.key_ea3577')}${rule.min}`;
            break;
          }
          if (rule.type === 'max' && Number(value) > (rule.max ?? Infinity)) {
            errors[field.key] =
              rule.message || `${t('components.components.hooks.key_30ab0e')}${rule.max}`;
            break;
          }
          if (rule.type === 'minLength' && String(value).length < (rule.minLength ?? 0)) {
            errors[field.key] =
              rule.message ||
              `${t('components.components.hooks.key_0bdbd6')}${rule.minLength}${t('components.components.hooks.key_f5ad99')}`;
            break;
          }
          if (rule.type === 'maxLength' && String(value).length > (rule.maxLength ?? Infinity)) {
            errors[field.key] =
              rule.message ||
              `${t('components.components.hooks.key_fe818d')}${rule.maxLength}${t('components.components.hooks.key_f5ad99')}`;
            break;
          }
          if (rule.type === 'pattern' && rule.pattern && !rule.pattern.test(String(value))) {
            errors[field.key] = rule.message || t('components.components.hooks.key_794871');
            break;
          }
          if (rule.validator) {
            const result = rule.validator(value);
            if (result !== true) {
              errors[field.key] =
                typeof result === 'string'
                  ? result
                  : rule.message || t('components.components.hooks.key_e441b1');
              break;
            }
          }
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [crud?.formFields, formData, formMode, setFormErrors]);

  const handleAutoFormSubmit = useCallback(async (): Promise<boolean> => {
    if (!crud) return false;
    if (!validateForm()) return false;
    const submitData = crud.transformFormData
      ? crud.transformFormData(formData, formMode === 'create' ? 'create' : 'edit')
      : formData;
    return handleFormSubmit(submitData);
  }, [crud, formData, formMode, handleFormSubmit, validateForm]);

  // // 自动Form渲染（formFields 模式）
  const renderAutoForm = useCallback((): React.ReactNode => {
    if (!crud?.formFields) return null;
    const colCount = crud.formColCount ?? 1;
    const visibleFields = crud.formFields.filter((field) => {
      if (formMode === 'create' && field.hideInCreate) return false;
      if (formMode === 'edit' && field.hideInEdit) return false;
      if (formMode === 'view' && field.hideInView) return false;
      if (field.visibleWhen && !field.visibleWhen(formData)) return false;
      return true;
    });

    const handleFieldChange = (key: string, value: unknown) => {
      setFormData((prev) => {
        const next = { ...prev, [key]: value };
        if (crud?.onFormDataChange) {
          const computed = crud.onFormDataChange(next, key);
          if (computed && typeof computed === 'object') {
            return { ...next, ...computed };
          }
        }
        return next;
      });
    };

    // // 注：为保持原有行为，此处仅Back null 占位，
    // // 实际Form字段渲染仍由主Component的 renderCrudFormFields 函数处理（避免大量 UI 代码搬迁导致的差异）
    void colCount;
    void visibleFields;
    void handleFieldChange;
    return null;
  }, [crud, formMode, formData, setFormData]);

  const formContent = useMemo(() => {
    if (crud?.renderForm) {
      return crud.renderForm({
        mode: formMode,
        record: currentRecord,
        submitting: formSubmitting,
        onSubmit: handleFormSubmit,
        onClose: closeForm,
      });
    }
    if (crud?.formFields) {
      return renderAutoForm();
    }
    return null;
  }, [crud, formMode, currentRecord, formSubmitting, handleFormSubmit, closeForm, renderAutoForm]);

  const hasForm = !!(crud?.renderForm || crud?.formFields);

  return {
    buildInitialFormData,
    openCreateForm,
    openEditForm,
    openViewForm,
    handleDelete,
    closeForm,
    handleFormSubmit,
    validateForm,
    handleAutoFormSubmit,
    renderAutoForm,
    formContent,
    hasForm,
  };
}

// ============ useCrudFetchParams ============

export interface UseCrudFetchParamsParams<T> {
  crud?: ListPageCrudConfig<T>;
  internalListStateResult: InternalListStateResult;
}

/**
 * CRUD fetch 参数构建 Hook
 * 将内部状态转换为后端期望的参数格式
 */
export function useCrudFetchParams<T>({
  crud,
  internalListStateResult,
}: UseCrudFetchParamsParams<T>) {
  const buildCrudFetchParams = useCallback((): Record<string, unknown> => {
    if (!crud || !internalListStateResult) return {};
    const stateParams: ListPageStateParams = {
      search: internalListStateResult.debouncedSearch,
      sortBy: internalListStateResult.sortBy,
      sortOrder: internalListStateResult.sortOrder as 'asc' | 'desc',
      page: internalListStateResult.currentPage,
      pageSize: internalListStateResult.pageSize,
      filters: (internalListStateResult.filters as Record<string, unknown>) || {},
    };

    if (crud.transformParams) {
      return crud.transformParams(stateParams);
    }

    if (
      crud.paramStyle ||
      crud.fieldMapping ||
      crud.searchParamName ||
      crud.sortByParamName ||
      crud.sortOrderParamName
    ) {
      return mapListParamsToBackend(stateParams, {
        style: crud.paramStyle ?? 'standard',
        searchParamName: crud.searchParamName,
        sortByParamName: crud.sortByParamName,
        sortOrderParamName: crud.sortOrderParamName,
        pageParamName: crud.pageParamName,
        pageSizeParamName: crud.pageSizeParamName,
        fieldMapping: crud.fieldMapping,
      });
    }

    return mapListParamsToBackend(stateParams, { style: 'standard' });
  }, [crud, internalListStateResult]);

  return { buildCrudFetchParams };
}

// ============ useListPageFilters ============

export interface UseListPageFiltersParams {
  filtersValue?: Record<string, unknown>;
  persistFilters?: boolean;
  filterStorageKey?: string;
  internalListStateResult: InternalListStateResult;
  onFilterChange?: (filters: Record<string, unknown>) => void;
}

export interface UseListPageFiltersResult {
  localFilters: Record<string, unknown>;
  setLocalFilters: (newFilters: Record<string, unknown>) => void;
  handleFilterChange: (newFilters: Record<string, unknown>) => void;
}

/**
 * 列表页筛选状态 Hook
 * 管理筛选条件、URL 同步、localStorage 持久化
 */
export function useListPageFilters({
  filtersValue,
  persistFilters,
  filterStorageKey,
  internalListStateResult,
  onFilterChange,
}: UseListPageFiltersParams): UseListPageFiltersResult {
  const [localFiltersState, setLocalFiltersState] = useState<Record<string, unknown>>(() => {
    if (persistFilters) {
      const key = filterStorageKey || window.location.pathname;
      try {
        const stored = localStorage.getItem(`listpage:filters:${key}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }
    return filtersValue || {};
  });

  const localFilters = internalListStateResult
    ? (internalListStateResult.filters as Record<string, unknown>)
    : localFiltersState;

  const setLocalFilters = useCallback(
    (newFilters: Record<string, unknown>) => {
      if (internalListStateResult) {
        internalListStateResult.setFilters(newFilters);
      } else {
        setLocalFiltersState(newFilters);
      }
    },
    [internalListStateResult]
  );

  useEffect(() => {
    if (persistFilters && onFilterChange) {
      const key = filterStorageKey || window.location.pathname;
      try {
        localStorage.setItem(`listpage:filters:${key}`, JSON.stringify(localFilters));
      } catch {
        // ignore
      }
    }
  }, [localFilters, persistFilters, filterStorageKey, onFilterChange]);

  const handleFilterChange = useCallback(
    (newFilters: Record<string, unknown>) => {
      setLocalFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [setLocalFilters, onFilterChange]
  );

  return { localFilters, setLocalFilters, handleFilterChange };
}

// ============ useListPageSearch ============

export interface UseListPageSearchParams {
  searchValue?: string;
  persistSearch?: boolean;
  filterStorageKey?: string;
  internalListStateResult: InternalListStateResult;
}

export interface UseListPageSearchResult {
  searchInput: string;
  localSearchInput: string;
  setLocalSearchInput: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * 列表页搜索状态 Hook
 * 管理搜索输入框的本地状态、URL 同步、localStorage 持久化
 */
export function useListPageSearch({
  searchValue,
  persistSearch,
  filterStorageKey,
  internalListStateResult,
}: UseListPageSearchParams): UseListPageSearchResult {
  const [localSearchInput, setLocalSearchInput] = useState(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      try {
        const stored = localStorage.getItem(`listpage:search:${key}`);
        if (stored) {
          return stored;
        }
      } catch {
        // ignore
      }
    }
    return searchValue || '';
  });

  const searchInput =
    searchValue !== undefined
      ? searchValue
      : internalListStateResult
        ? internalListStateResult.searchQuery
        : localSearchInput;

  useEffect(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      try {
        localStorage.setItem(`listpage:search:${key}`, searchInput);
      } catch {
        // ignore
      }
    }
  }, [searchInput, persistSearch, filterStorageKey]);

  return { searchInput, localSearchInput, setLocalSearchInput };
}

// ============ useViewMode ============

export interface UseViewModeParams {
  viewModeProp?: ListViewMode;
  defaultViewMode?: ListViewMode;
  onViewModeChange?: (mode: ListViewMode) => void;
  isViewModeUrlSyncEnabled: boolean;
  viewModeUrlState: ListViewMode;
  setViewModeUrlState: (mode: ListViewMode) => void;
}

export interface UseViewModeResult {
  viewModeLocal: ListViewMode;
  setViewModeLocal: React.Dispatch<React.SetStateAction<ListViewMode>>;
  effectiveViewMode: ListViewMode;
  handleViewModeChange: (mode: ListViewMode) => void;
}

/**
 * 视图模式 Hook
 * 管理表格视图/卡片视图的切换状态
 */
export function useViewMode({
  viewModeProp,
  defaultViewMode = 'table',
  onViewModeChange,
  isViewModeUrlSyncEnabled,
  viewModeUrlState,
  setViewModeUrlState,
}: UseViewModeParams): UseViewModeResult {
  const [viewModeLocal, setViewModeLocal] = useState<ListViewMode>(defaultViewMode);

  const effectiveViewMode: ListViewMode = useMemo(() => {
    if (viewModeProp) return viewModeProp;
    if (isViewModeUrlSyncEnabled) return viewModeUrlState;
    return viewModeLocal;
  }, [viewModeProp, isViewModeUrlSyncEnabled, viewModeUrlState, viewModeLocal]);

  const handleViewModeChange = useCallback(
    (mode: ListViewMode) => {
      if (viewModeProp) {
        onViewModeChange?.(mode);
        return;
      }
      if (isViewModeUrlSyncEnabled) {
        setViewModeUrlState(mode);
        onViewModeChange?.(mode);
        return;
      }
      setViewModeLocal(mode);
      onViewModeChange?.(mode);
    },
    [viewModeProp, isViewModeUrlSyncEnabled, setViewModeUrlState, onViewModeChange]
  );

  return { viewModeLocal, setViewModeLocal, effectiveViewMode, handleViewModeChange };
}

// ============ useCrudRowActions ============

export interface UseCrudRowActionsParams<T> {
  crud?: ListPageCrudConfig<T>;
  hasForm: boolean;
  rowActions?: RowAction<T>[];
  openEditForm: (record: T) => void;
  handleDelete: (record: T) => Promise<boolean>;
}

/**
 * CRUD 行操作生成 Hook
 * 在 crud 模式下自动生成行操作（编辑/删除）并合并自定义操作
 */
export function useCrudRowActions<T>({
  crud,
  hasForm,
  rowActions,
  openEditForm,
  handleDelete,
}: UseCrudRowActionsParams<T>) {
  const resolvedRowActions = useMemo(() => {
    if (!crud || !hasForm) return rowActions;
    const builtInActions: RowAction<T>[] = [];
    builtInActions.push({
      key: 'edit',
      label: t('components.components.hooks.key_95b351'),
      icon: <Edit size={16} />,
      onClick: (row: T) => openEditForm(row),
    });
    builtInActions.push({
      key: 'delete',
      label: t('components.components.hooks.key_2f4aad'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (row: T) => handleDelete(row),
    });
    return [...builtInActions, ...(crud.rowActions || []), ...(rowActions || [])];
  }, [crud, hasForm, rowActions, openEditForm, handleDelete]);

  return resolvedRowActions;
}

// ============ useCrudBatchActions ============

export interface UseCrudBatchActionsParams<T> {
  crud?: ListPageCrudConfig<T>;
  crudResult: UseCrudQueriesResult<T>;
  batchActions?: BatchAction<T>[];
}

/**
 * CRUD 批量操作生成 Hook
 * 在 crud 模式下自动生成批量删除并合并自定义操作
 */
export function useCrudBatchActions<T>({
  crud,
  crudResult,
  batchActions,
}: UseCrudBatchActionsParams<T>) {
  const resolvedBatchActions = useMemo(() => {
    if (!crud) return batchActions;
    const builtInActions: BatchAction<T>[] = [];
    if (crud.selectable && crudResult?.bulkDelete) {
      builtInActions.push({
        label: t('components.components.hooks.key_7fb62b'),
        icon: null,
        color: 'error',
        onClick: (selectedRows: T[]) => {
          const ids = selectedRows
            .map((row: T) => (row as Record<string, unknown>).id)
            .filter(Boolean);
          if (ids.length === 0) return;
          if (
            confirm(`${i18n.t('components.hooks.k0')}${ids.length}${t('components.components.hooks.key_8e61d9')}`)
          ) {
            crudResult.bulkDelete(ids as string[]);
          }
        },
      });
    }
    return [...builtInActions, ...(crud.bulkActions || []), ...(batchActions || [])];
  }, [crud, crudResult, batchActions]);

  return resolvedBatchActions;
}

// ============ useCrudActions ============

export interface UseCrudActionsParams<T> {
  crud?: ListPageCrudConfig<T>;
  hasForm: boolean;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
  }>;
  openCreateForm: () => void;
}

/**
 * CRUD 操作按钮生成 Hook
 * 在 crud 模式下自动生成t('components.hooks.26bb84')按钮并合并自定义操作
 */
export function useCrudActions<T>({
  crud,
  hasForm,
  actions,
  openCreateForm,
}: UseCrudActionsParams<T>) {
  const effectiveActions = useMemo(() => {
    if (!hasForm || !crud || crud.showCreateButton === false) return actions;
    const createAction = {
      label: crud.createButtonText || t('components.components.hooks.key_26bb84'),
      icon: <Plus size={18} />,
      variant: 'contained' as const,
      onClick: openCreateForm,
    };
    return actions ? [...actions, createAction] : [createAction];
  }, [crud, actions, openCreateForm, hasForm]);

  return effectiveActions;
}

// ============ useResolvedColumns ============

export interface UseResolvedColumnsParams<T> {
  columns: ColumnDef<T>[];
  crud?: ListPageCrudConfig<T>;
}

/**
 * CRUD 模式下从 formFields 自动生成表格列
 */
export function useResolvedColumns<T>({ columns, crud }: UseResolvedColumnsParams<T>) {
  const resolvedColumns = useMemo<ColumnDef<T>[]>(() => {
    if (columns && columns.length > 0) return columns;
    if (!crud?.formFields) return columns;
    return crud.formFields
      .filter((field) => !field.hideInTable && field.key !== 'id')
      .map((field) => {
        const col: ColumnDef<T> = {
          id: field.key,
          label: field.label,
          sortable: field.tableSortable !== false,
          width: field.tableWidth,
          fixed: field.tableFixed,
          treeColumn: field.tableTreeColumn,
          summaryType: field.tableSummaryType,
          summaryRender: field.tableSummaryRender as ((data: T[]) => React.ReactNode) | undefined,
          editable: field.tableEditable,
        };

        if (field.tableRender) {
          col.render = (row: T, index: number) =>
            field.tableRender!(
              (row as Record<string, unknown>)[field.key],
              row as Record<string, unknown>,
              index
            );
          return col;
        }

        if (
          field.tableStatus ||
          (field.type === 'select' && (field.tableStatusColorMap || field.tableStatusLabelMap))
        ) {
          const colorMap = field.tableStatusColorMap || {};
          const labelMap = field.tableStatusLabelMap || {};
          col.render = (row: T) => {
            const value = String((row as Record<string, unknown>)[field.key] ?? '');
            const label = labelMap[value] || value || '-';
            const color = colorMap[value] || 'default';
            return (
              <Chip
                label={label}
                size='small'
                color={color as 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'}
                variant='outlined'
              />
            );
          };
          return col;
        }

        if (field.type === 'switch') {
          col.render = (row: T) => {
            const value = (row as Record<string, unknown>)[field.key];
            return (
              <Chip
                label={
                  value ? ` + ${t('components.hooks.0a60ac')} + ` : t('components.hooks.c9744f')
                }
                size='small'
                color={value ? 'success' : 'default'}
                variant='outlined'
              />
            );
          };
          return col;
        }

        if (field.type === 'date') {
          col.render = (row: T) => {
            const value = (row as Record<string, unknown>)[field.key];
            return value ? String(value) : '-';
          };
          return col;
        }

        return col;
      }) as ColumnDef<T>[];
  }, [columns, crud?.formFields]);

  return resolvedColumns;
}

// ============ useResolvedCrudConfig ============

export interface UseResolvedCrudConfigParams {
  crud?: ListPageCrudConfig<Record<string, unknown>>;
  columnResizable?: boolean;
  treeView?: boolean;
  showSummary?: boolean;
  summaryPosition?: 'top' | 'bottom';
  inlineEditable?: boolean;
  inlineEditMode?: 'cell' | 'row';
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  title?: string;
  filters?: Array<{
    id: string;
    label: string;
    type: string;
    options?: Array<{ label: string; value: string | number }>;
    defaultValue?: string | number;
  }>;
  cardViewConfig?: CardViewConfig<Record<string, unknown>>;
  exportable?: boolean;
  exportFileName?: string;
  exportFormats?: Array<'csv' | 'excel' | 'json'>;
  exportScopes?: Array<'current' | 'all' | 'selected'>;
}

/**
 * CRUD 模式下自动推断各项配置
 * 当外部未显式传入时，从 crud 配置推导默认值
 */
export function useResolvedCrudConfig({
  crud,
  columnResizable,
  treeView,
  showSummary,
  summaryPosition,
  inlineEditable,
  inlineEditMode,
  searchable,
  searchPlaceholder,
  searchValue,
  onSearch,
  onSearchChange,
  title,
  filters,
  cardViewConfig,
}: UseResolvedCrudConfigParams) {
  const resolvedColumnResizable = useMemo(() => {
    if (columnResizable !== undefined) return columnResizable;
    if (crud?.columnResizable) return true;
    return false;
  }, [columnResizable, crud]);

  const resolvedTreeView = useMemo(() => {
    if (treeView !== undefined) return treeView;
    if (crud?.treeView) return true;
    return false;
  }, [treeView, crud]);

  const resolvedShowSummary = useMemo(() => {
    if (showSummary !== undefined) return showSummary;
    if (crud?.showSummary) return true;
    return false;
  }, [showSummary, crud]);

  const resolvedSummaryPosition = useMemo<'top' | 'bottom'>(() => {
    if (summaryPosition !== undefined) return summaryPosition;
    if (crud?.summaryPosition) return crud.summaryPosition;
    return 'bottom';
  }, [summaryPosition, crud]);

  const resolvedInlineEditable = useMemo(() => {
    if (inlineEditable !== undefined) return inlineEditable;
    if (crud?.inlineEditable) return true;
    return false;
  }, [inlineEditable, crud]);

  const resolvedInlineEditMode = useMemo<'cell' | 'row'>(() => {
    if (inlineEditMode !== undefined) return inlineEditMode;
    if (crud?.inlineEditMode) return crud.inlineEditMode;
    return 'cell';
  }, [inlineEditMode, crud]);

  const resolvedSearchable = useMemo(() => {
    if (searchable !== undefined) return searchable;
    if (crud) {
      return crud.searchable !== false;
    }
    return !!onSearch || !!onSearchChange || !!searchValue;
  }, [searchable, crud, onSearch, onSearchChange, searchValue]);

  const resolvedSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder !== t('components.hooks.64e327ed')) return searchPlaceholder;
    if (crud?.searchPlaceholder) return crud.searchPlaceholder;
    if (title) return `${t('components.components.hooks.key_f9b30d')}${title}...`;
    return searchPlaceholder;
  }, [searchPlaceholder, crud, title]);

  const resolvedFilters = useMemo(() => {
    if (filters && filters.length > 0) return filters;
    if (!crud?.formFields || !crud.autoGenerateFilters) return filters || [];
    return crud.formFields
      .filter((field) => {
        if (field.type !== 'select') return false;
        if (!field.options || field.options.length === 0) return false;
        if (field.hideInTable) return false;
        return true;
      })
      .map((field) => ({
        id: field.key,
        label: field.label,
        type: 'select' as const,
        options: field.options!.map((opt) => ({
          label: opt.label,
          value: String(opt.value),
        })),
        defaultValue: '',
      }));
  }, [filters, crud]);

  const resolvedCardViewConfig = useMemo(() => {
    if (cardViewConfig) return cardViewConfig;
    if (!crud?.formFields || !crud.cardView) return;

    const fields = crud.formFields;
    let titleField = fields.find((f) => f.cardTitle);
    if (!titleField) {
      titleField = fields.find((f) => ['name', 'title', 'code'].includes(f.key));
    }
    let subtitleField = fields.find((f) => f.cardSubtitle);
    if (!subtitleField) {
      subtitleField = fields.find((f) => ['description', 'remark', 'note'].includes(f.key));
    }
    let statusField = fields.find((f) => f.cardStatus);
    if (!statusField) {
      statusField = fields.find((f) => ['status', 'state'].includes(f.key));
    }
    const cardFields = fields
      .filter((f) => {
        if (f.hideInCard) return false;
        if (f.key === 'id') return false;
        if (titleField && f.key === titleField.key) return false;
        if (subtitleField && f.key === subtitleField.key) return false;
        if (statusField && f.key === statusField.key) return false;
        return true;
      })
      .sort((a, b) => (a.cardOrder ?? 999) - (b.cardOrder ?? 999))
      .slice(0, 6)
      .map((f) => ({ key: f.key, label: f.label, showLabel: true }));

    return {
      title: titleField?.key,
      subtitle: subtitleField?.key,
      statusField: statusField?.key,
      statusColorMap: crud.cardStatusColorMap,
      statusLabelMap: crud.cardStatusLabelMap,
      fields: cardFields,
      fieldsPerRow: crud.cardFieldsPerRow ?? 2,
    };
  }, [cardViewConfig, crud]);

  return {
    resolvedColumnResizable,
    resolvedTreeView,
    resolvedShowSummary,
    resolvedSummaryPosition,
    resolvedInlineEditable,
    resolvedInlineEditMode,
    resolvedSearchable,
    resolvedSearchPlaceholder,
    resolvedFilters,
    resolvedCardViewConfig,
  };
}
