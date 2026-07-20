import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Tooltip,
  Checkbox,
  Skeleton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  FormHelperText,
  Radio,
  RadioGroup,
  FormGroup,
  Input,
} from '@mui/material';
import {
  AlertTriangle as WarningIcon,
  MoreHorizontal,
  ChevronRight,
  Columns3,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { EmptyState, ErrorEmptyState, BackButton } from '@topems/shared-components';
import { Link as RouterLink } from 'react-router-dom';
import { useAutoBreadcrumbs, useListPageState, useUrlListState, useCrudOperations, useColumnConfig, useColumnWidth, useUrlState } from '@/hooks';
import { logger } from '@/utils/logger';
import { mapListParamsToBackend } from '@/utils/listParamMapping';
import { FormDialog, FormDrawer } from '@/components/common';

// 从子组件导入类型和组件
import type { ListPageTemplateProps, ColumnConfig, RowAction, BatchAction, ListViewMode, ColumnDef } from './list';
import type { FilterConfig } from '@topems/shared-components';
import { loadColumnConfig, saveColumnConfig } from './list/types';
import { ListSearchBar } from './list/ListSearchBar';
import { ListBatchActions } from './list/ListBatchActions';
import { ListColumnConfig } from './list/ListColumnConfig';
import { CardView } from './list/CardView';

// ============ 列表页模板组件 ============

/**
 * 列表页模板组件
 * 提供完整的列表页面布局，包括搜索、筛选、排序、分页、行操作等功能
 *
 * @example
 * ```tsx
 * <ListPageTemplate
 *   title="用户列表"
 *   columns={[
 *     { id: 'name', label: '姓名', sortable: true },
 *     { id: 'email', label: '邮箱' },
 *   ]}
 *   data={users}
 *   selectable
 *   batchActions={[
 *     { label: '批量删除', icon: <Trash2 />, color: 'error', confirm: true },
 *   ]}
 *   filters={[
 *     { id: 'status', label: '状态', type: 'multiselect', options: statusOptions },
 *   ]}
 *   columnConfigurable
 *   showRowNumber
 * />
 * ```
 */
export function ListPageTemplate<T>({
  title,
  subtitle,
  breadcrumbs: manualBreadcrumbs,
  autoBreadcrumbs = true,
  backButton,
  columns,
  data: propData,
  loading: propLoading,
  error: propError,
  crud,
  getRowId = (row: T) => (row as unknown as Record<string, unknown>).id as string | number,
  onRowClick,
  selectable,
  onSelectionChange,
  selection,
  sortable,
  defaultSortBy,
  defaultSortOrder = 'asc',
  onSort,
  pagination,
  // 兼容旧版扁平化分页属性
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  searchable,
  searchPlaceholder = '搜索...',
  searchValue,
  onSearch,
  onSearchChange,
  globalSearch,
  filters,
  filtersValue,
  onFilterChange,
  actions,
  renderRowActions,
  rowActions,
  onRefresh,
  showBatchActionBar = true,
  emptyMessage = '暂无数据',
  emptyIcon,
  headerContent,
  filterContent,
  footerContent,
  // 新增属性
  expandable,
  defaultExpandedIds = [],
  onExpandedChange,
  columnConfigurable,
  defaultColumnConfig = [],
  onColumnConfigChange,
  persistColumnConfig = false,
  columnConfigStorageKey = 'default',
  columnConfig: columnConfigProp,
  // 列宽调整
  columnResizable,
  defaultColumnWidth,
  minColumnWidth,
  maxColumnWidth,
  persistColumnWidth = true,
  columnWidthStorageKey = 'default',
  onColumnWidthChange,
  // 树形表格
  treeView = false,
  treeChildrenField = 'children',
  treeNodeKeyField = 'id',
  defaultExpandedKeys,
  expandedKeys: expandedKeysProp,
  onExpandedKeysChange,
  treeIndentSize = 24,
  loadTreeChildren,
  // 汇总行
  showSummary = false,
  summaryPosition = 'bottom',
  // 行内编辑
  inlineEditable = false,
  inlineEditMode = 'cell',
  onInlineEditSave,
  onInlineEditCancel,
  editingRowId: editingRowIdProp,
  onEditingRowIdChange,
  showRowNumber = false,
  striped = false,
  primaryActionButton,
  // 移动端卡片视图属性
  mobileCardRender,
  mobileCardTitleKey,
  mobileCardSubtitleKey,
  mobileCardDisplayFields,
  mobileCardFieldLabels,
  // 导出功能
  exportable,
  exportFileName,
  exportFormat = 'csv',
  exportFormats,
  exportScopes,
  exportTransform,
  exportColumns,
  exportIncludeHeader = true,
  // 筛选记忆
  persistFilters,
  filterStorageKey,
  // 搜索记忆
  persistSearch,
  // 内置列表状态
  internalListState,
  onDebouncedSearch,
  // URL同步（便捷开关）
  urlSync: urlSyncProp,
  urlPrefix: urlPrefixProp,
  // 空状态操作
  emptyActionButton,
  // 快捷筛选
  quickFilters,
  // 批量操作
  batchActions,
  enableBatchSelection,
  // 视图模式
  viewMode: viewModeProp,
  defaultViewMode = 'table',
  onViewModeChange,
  viewModes: viewModesProp,
  renderCardView,
  renderCardItem,
  cardGridColumns,
  cardViewConfig,
  // 排除自定义属性的剩余props
  ...props
}: ListPageTemplateProps<T>) {
  // ---- 声明式 CRUD（仅当传入 crud 时启用） ----
  // 注意：crudResult 使用 `any` 类型以避免影响组件泛型 T 的推断
  const dummyApi: any = {
    list: () => Promise.resolve({ success: true, code: 0, message: '', data: { items: [], total: 0 } }),
    get: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    create: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    update: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    delete: () => Promise.resolve({ success: true, code: 0, message: '', data: '' }),
  };
  const crudApi: any = crud?.api ?? dummyApi;
  const crudQueryKey: string = crud?.queryKey ?? `__dummy_${Math.random().toString(36).slice(2)}`;
  const crudResult: any = useCrudOperations({
    api: crudApi,
    queryKey: crudQueryKey,
    autoFetch: crud ? (crud.autoFetch ?? true) : false,
    defaultPageSize: crud?.defaultPageSize ?? 10,
    pageParamName: crud?.pageParamName ?? 'page',
    pageSizeParamName: crud?.pageSizeParamName ?? 'pagesize',
    entityName: crud?.entityName,
  });

  // 内置列表页状态（传入 internalListState 或 crud 时启用）
  // - 显式 internalListState：按配置执行
  // - 仅 crud：用 crud 配置推导默认内部状态
  // - 都没有：null（完全受控模式）
  // 顶级 urlSync / urlPrefix 作为便捷开关，优先级低于 internalListState / crud 中的具体配置
  const effectiveListState = internalListState
    ? {
        ...internalListState,
        urlSync: internalListState.urlSync ?? urlSyncProp ?? false,
        urlPrefix: internalListState.urlPrefix ?? urlPrefixProp,
      }
    : crud
      ? {
          defaultPageSize: crud.defaultPageSize ?? 10,
          baseIndex: 1 as const,
          urlSync: crud.urlSync ?? urlSyncProp ?? false,
          urlPrefix: crud.urlPrefix ?? urlPrefixProp,
        }
      : null;

  const internalListStateResult = effectiveListState
    ? effectiveListState.urlSync
      ? useUrlListState({
          defaultSearch: effectiveListState.defaultSearch,
          baseIndex: effectiveListState.baseIndex,
          defaultPage: effectiveListState.defaultPage,
          defaultPageSize: effectiveListState.defaultPageSize,
          debounceMs: effectiveListState.debounceMs,
          prefix: effectiveListState.urlPrefix,
          historyMode: effectiveListState.urlSync,
        })
      : useListPageState(effectiveListState)
    : null;

  // 解析最终数据/加载状态/错误：外部传入优先，其次 crud 内部
  const data = propData ?? (crud ? crudResult.data : []);
  const loading = propLoading ?? (crud ? crudResult.loading : false);
  const error = propError ?? (crud && crudResult.error ? crudResult.error : null);
  const resolvedTotal = total ?? (crud ? crudResult.pagination.total : 0);

  // crud 模式下从 formFields 自动生成表格列
  const resolvedColumns = useMemo<ColumnDef<T>[]>(() => {
    if (columns && columns.length > 0) return columns;
    if (!crud?.formFields) return columns;
    return crud.formFields
      .filter((field) => !field.hideInTable && field.key !== 'id')
      .map((field) => {
        const col: ColumnDef<any> = {
          id: field.key,
          label: field.label,
          sortable: field.tableSortable !== false,
          width: field.tableWidth,
          fixed: field.tableFixed,
          treeColumn: field.tableTreeColumn,
          summaryType: field.tableSummaryType,
          summaryRender: field.tableSummaryRender,
          editable: field.tableEditable,
        };

        // 自定义渲染（优先级最高）
        if (field.tableRender) {
          col.render = (row: any, index: number) =>
            field.tableRender!(row[field.key], row, index);
          return col;
        }

        // 状态 Chip 渲染（tableStatus 显式标记，或 select 类型且有状态映射）
        if (field.tableStatus || (field.type === 'select' && (field.tableStatusColorMap || field.tableStatusLabelMap))) {
          const colorMap = field.tableStatusColorMap || {};
          const labelMap = field.tableStatusLabelMap || {};
          col.render = (row: any) => {
            const value = row[field.key];
            const label = labelMap[value] || value || '-';
            const color = colorMap[value] || 'default';
            return <Chip label={label} size='small' color={color as any} variant='outlined' />;
          };
          return col;
        }

        // 布尔值 / switch 类型渲染
        if (field.type === 'switch') {
          col.render = (row: any) => {
            const value = row[field.key];
            return (
              <Chip
                label={value ? '是' : '否'}
                size='small'
                color={value ? 'success' : 'default'}
                variant='outlined'
              />
            );
          };
          return col;
        }

        // 日期类型格式化
        if (field.type === 'date') {
          col.render = (row: any) => {
            const value = row[field.key];
            return value || '-';
          };
          return col;
        }

        return col;
      }) as ColumnDef<T>[];
  }, [columns, crud?.formFields]);

  // 列宽调整
  const columnWidthResult = useColumnWidth({
    storageKey: (columnResizable || crud?.columnResizable) && persistColumnWidth ? columnWidthStorageKey : undefined,
    defaultWidth: defaultColumnWidth ?? crud?.defaultColumnWidth,
    minWidth: minColumnWidth ?? crud?.minColumnWidth,
    maxWidth: maxColumnWidth ?? crud?.maxColumnWidth,
    persist: persistColumnWidth,
    columns: resolvedColumns.map((col) => ({
      id: col.id,
      width: typeof col.width === 'number' ? col.width : undefined,
      minWidth: col.minWidth,
      maxWidth: col.maxWidth,
    })),
  });

  // crud 模式下自动推断列宽调整是否启用
  const resolvedColumnResizable = useMemo(() => {
    if (columnResizable !== undefined) return columnResizable;
    if (crud?.columnResizable) return true;
    return false;
  }, [columnResizable, crud]);

  // crud 模式下自动推断树形表格配置
  const resolvedTreeView = useMemo(() => {
    if (treeView !== undefined) return treeView;
    if (crud?.treeView) return true;
    return false;
  }, [treeView, crud]);

  // crud 模式下自动推断汇总行配置
  const resolvedShowSummary = useMemo(() => {
    if (showSummary !== undefined) return showSummary;
    if (crud?.showSummary) return true;
    return false;
  }, [showSummary, crud]);

  const resolvedSummaryPosition = useMemo(() => {
    if (summaryPosition !== undefined) return summaryPosition;
    if (crud?.summaryPosition) return crud.summaryPosition;
    return 'bottom';
  }, [summaryPosition, crud]);

  // crud 模式下自动推断行内编辑配置
  const resolvedInlineEditable = useMemo(() => {
    if (inlineEditable !== undefined) return inlineEditable;
    if (crud?.inlineEditable) return true;
    return false;
  }, [inlineEditable, crud]);

  const resolvedInlineEditMode = useMemo(() => {
    if (inlineEditMode !== undefined) return inlineEditMode;
    if (crud?.inlineEditMode) return crud.inlineEditMode;
    return 'cell';
  }, [inlineEditMode, crud]);

  // 列宽变化时通知外部
  useEffect(() => {
    if (onColumnWidthChange) {
      onColumnWidthChange(columnWidthResult.columnWidths);
    }
  }, [columnWidthResult.columnWidths, onColumnWidthChange]);

  // crud 模式下从 formFields 自动生成 cardViewConfig
  const resolvedCardViewConfig = useMemo(() => {
    if (cardViewConfig) return cardViewConfig;
    if (!crud?.formFields || !crud.cardView) return undefined;

    const fields = crud.formFields;
    
    // 查找标题字段（第一个 cardTitle 为 true 的字段，或 name/title/code 字段）
    let titleField = fields.find((f) => f.cardTitle);
    if (!titleField) {
      titleField = fields.find((f) => ['name', 'title', 'code'].includes(f.key));
    }
    
    // 查找副标题字段（第一个 cardSubtitle 为 true 的字段）
    let subtitleField = fields.find((f) => f.cardSubtitle);
    if (!subtitleField) {
      subtitleField = fields.find((f) => ['description', 'remark', 'note'].includes(f.key));
    }
    
    // 查找状态字段（第一个 cardStatus 为 true 的字段，或 status/state 字段）
    let statusField = fields.find((f) => f.cardStatus);
    if (!statusField) {
      statusField = fields.find((f) => ['status', 'state'].includes(f.key));
    }
    
    // 构建卡片显示字段（排除标题、副标题、状态字段和 hideInCard 的字段）
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
      .slice(0, 6) // 最多显示 6 个字段
      .map((f) => ({
        key: f.key,
        label: f.label,
        showLabel: true,
      }));

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

  // ==================== 树形表格 ====================
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<(string | number)[]>(
    defaultExpandedKeys ?? []
  );
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

  // 扁平化树形数据为一维数组（用于渲染），并记录每个节点的层级
  const flatData = useMemo<Array<{ row: T; level: number; parentKey?: string | number }>>(() => {
    if (!resolvedTreeView) return data.map((row) => ({ row, level: 0 }));
    const result: Array<{ row: T; level: number; parentKey?: string | number }> = [];
    const flatten = (
      items: T[],
      level: number,
      parentKey?: string | number
    ) => {
      items.forEach((item) => {
        const key = (item as unknown as Record<string, unknown>)[treeNodeKeyField] as string | number;
        result.push({ row: item, level, parentKey });
        const children = (item as unknown as Record<string, unknown>)[
          treeChildrenField
        ] as T[] | undefined;
        if (children && children.length > 0 && resolvedExpandedKeys.includes(key)) {
          flatten(children, level + 1, key);
        }
      });
    };
    flatten(data, 0);
    return result;
  }, [data, resolvedTreeView, treeNodeKeyField, treeChildrenField, resolvedExpandedKeys]);

  // 树形表格的数据（用于表格渲染）
  const treeTableData = useMemo(() => {
    if (!resolvedTreeView) return data;
    return flatData.map((item) => item.row);
  }, [resolvedTreeView, flatData, data]);

  // 获取行的层级（树形表格用）
  const getRowLevel = useCallback(
    (rowId: string | number): number => {
      if (!resolvedTreeView) return 0;
      const item = flatData.find(
        (f) =>
          (f.row as unknown as Record<string, unknown>)[treeNodeKeyField] === rowId
      );
      return item?.level ?? 0;
    },
    [resolvedTreeView, flatData, treeNodeKeyField]
  );

  // 检查行是否有子节点
  const hasChildren = useCallback(
    (row: T): boolean => {
      if (!resolvedTreeView) return false;
      const children = (row as unknown as Record<string, unknown>)[
        treeChildrenField
      ] as T[] | undefined;
      return !!(children && children.length > 0);
    },
    [resolvedTreeView, treeChildrenField]
  );

  // 找到树节点列
  const treeColumnId = useMemo(() => {
    const treeCol = resolvedColumns.find((col) => col.treeColumn);
    return treeCol?.id || resolvedColumns[0]?.id;
  }, [resolvedColumns]);

  // ==================== 行内编辑 ====================
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

  // 开始编辑行
  const startEditing = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      setEditingData({ ...row } as Partial<T>);
      setEditingRowId(rowId);
    },
    [getRowId, setEditingRowId]
  );

  // 取消编辑
  const cancelEditing = useCallback(
    (row: T) => {
      setEditingData(null);
      setEditingRowId(null);
      onInlineEditCancel?.(row);
    },
    [setEditingRowId, onInlineEditCancel]
  );

  // 保存编辑
  const saveEditing = useCallback(
    async (row: T) => {
      if (!editingData) return;
      const changes = editingData;
      try {
        await onInlineEditSave?.(row, changes);
        setEditingData(null);
        setEditingRowId(null);
      } catch (e) {
        // 保存失败，保持编辑状态
      }
    },
    [editingData, onInlineEditSave, setEditingRowId]
  );

  // 更新编辑中的字段值
  const updateEditingField = useCallback(
    (field: keyof T, value: unknown) => {
      setEditingData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // crud 模式下自动推断搜索配置
  const resolvedSearchable = useMemo(() => {
    if (searchable !== undefined) return searchable;
    if (crud) {
      return crud.searchable !== false;
    }
    return !!onSearch || !!onSearchChange || !!searchValue;
  }, [searchable, crud, onSearch, onSearchChange, searchValue]);

  const resolvedSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder !== '搜索...') return searchPlaceholder;
    if (crud?.searchPlaceholder) return crud.searchPlaceholder;
    if (title) return `搜索${title}...`;
    return searchPlaceholder;
  }, [searchPlaceholder, crud, title]);

  // crud 模式下从 formFields 自动生成筛选配置
  const resolvedFilters = useMemo<FilterConfig[]>(() => {
    if (filters && filters.length > 0) return filters;
    if (!crud?.formFields || !crud.autoGenerateFilters) return filters || [];
    
    // 自动从 select 类型的字段生成筛选器
    return crud.formFields
      .filter((field) => {
        if (field.type !== 'select') return false;
        if (!field.options || field.options.length === 0) return false;
        // 不生成在表格中隐藏的字段筛选
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

  // crud 模式下自动生成统计卡片
  const resolvedStatsCards = useMemo(() => {
    if (crud?.statsCards && crud.statsCards.length > 0) return crud.statsCards;
    if (!crud?.showStatsCards) return null;
    if (!crud.formFields) return null;

    const cards: Array<{
      key: string;
      label: string;
      value: number | string;
      color: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
    }> = [];

    // 总数卡片
    cards.push({
      key: 'total',
      label: '总数',
      value: crudResult?.data?.total ?? 0,
      color: 'primary',
    });

    // 状态统计卡片
    const statusField = crud.statsStatusField || 
      crud.formFields.find((f) => f.tableStatus || f.key === 'status' || f.key === 'state');
    
    if (statusField) {
      const fieldKey = crud.statsStatusField || 
        (typeof statusField !== 'string' ? statusField.key : statusField);
      const fieldConfig = crud.formFields.find((f) => f.key === fieldKey);
      const colorMap = fieldConfig?.tableStatusColorMap || {};
      const labelMap = fieldConfig?.tableStatusLabelMap || {};
      const options = fieldConfig?.options || [];

      options.forEach((opt) => {
        const count = crudResult?.data?.items?.filter(
          (item: any) => item[fieldKey] === opt.value
        ).length || 0;
        cards.push({
          key: `status_${opt.value}`,
          label: labelMap[opt.value as string] || String(opt.label),
          value: count,
          color: (colorMap[opt.value as string] as any) || 'default',
        });
      });
    }

    return cards;
  }, [crud, crudResult?.data?.total, crudResult?.data?.items]);

  // crud 模式下自动生成快速筛选
  const resolvedQuickFilters = useMemo(() => {
    if (quickFilters && quickFilters.length > 0) return quickFilters;
    if (!crud?.autoQuickFilters) return quickFilters;
    if (!crud.formFields) return quickFilters;

    // 找到用于快速筛选的字段
    let filterFieldKey = crud.quickFilterField;
    if (!filterFieldKey) {
      const statusField = crud.formFields.find(
        (f) => f.tableStatus || f.key === 'status' || f.key === 'state'
      );
      if (statusField) filterFieldKey = statusField.key;
    }

    if (!filterFieldKey) return quickFilters;

    const fieldConfig = crud.formFields.find((f) => f.key === filterFieldKey);
    if (!fieldConfig?.options || fieldConfig.options.length === 0) return quickFilters;

    const filters: Array<{
      key: string;
      label: string;
      filters: Record<string, any>;
    }> = [];

    // 全部选项
    if (crud.quickFilterShowAll !== false) {
      filters.push({
        key: 'all',
        label: '全部',
        filters: {},
      });
    }

    // 各状态选项
    const labelMap = fieldConfig.tableStatusLabelMap || {};
    fieldConfig.options.forEach((opt) => {
      filters.push({
        key: String(opt.value),
        label: labelMap[opt.value as string] || String(opt.label),
        filters: { [filterFieldKey!]: opt.value },
      });
    });

    return filters;
  }, [quickFilters, crud]);

  // crud 模式下的统一 fetch 构建（拼接搜索/筛选/排序参数，支持 transformParams 转换）
  const buildCrudFetchParams = (): Record<string, unknown> => {
    if (!crud || !internalListStateResult) return {};
    const stateParams = {
      search: internalListStateResult.debouncedSearch,
      sortBy: internalListStateResult.sortBy,
      sortOrder: internalListStateResult.sortOrder as 'asc' | 'desc',
      page: internalListStateResult.currentPage,
      pageSize: internalListStateResult.pageSize,
      filters: (internalListStateResult.filters as Record<string, unknown>) || {},
    };

    // 最高优先级：自定义 transformParams
    if (crud.transformParams) {
      return crud.transformParams(stateParams);
    }

    // 使用统一参数映射层
    if (crud.paramStyle || crud.fieldMapping || crud.searchParamName || crud.sortByParamName || crud.sortOrderParamName) {
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

    // 默认：standard 风格
    return mapListParamsToBackend(stateParams, {
      style: 'standard',
    });
  };

  // 当启用 crud 时，用内部状态驱动列表查询
  useEffect(() => {
    if (!crud || !internalListStateResult) return;
    crudResult.fetch(buildCrudFetchParams());
  }, [
    crud,
    crudResult,
    internalListStateResult?.debouncedSearch,
    internalListStateResult?.sortBy,
    internalListStateResult?.sortOrder,
    internalListStateResult?.filters,
    internalListStateResult,
  ]);

  // crud 数据加载回调
  useEffect(() => {
    if (!crud) return;
    if (crudResult.error && crud.onDataError) {
      crud.onDataError(new Error(crudResult.error));
    }
  }, [crudResult.error, crud]);

  useEffect(() => {
    if (!crud) return;
    if (!crudResult.loading && crudResult.data?.length > 0 && crud.onDataLoaded) {
      crud.onDataLoaded(crudResult.data, crudResult.pagination.total);
    }
  }, [crudResult.data, crudResult.loading, crudResult.pagination.total, crud]);

  // ============ CRUD 表单状态 ============
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 从 formFields 构建初始表单数据
  const buildInitialFormData = useCallback((mode: 'create' | 'edit' | 'view', record?: any): Record<string, unknown> => {
    if (!crud?.formFields) return {};
    const data: Record<string, unknown> = {};
    crud.formFields.forEach((field) => {
      if (mode === 'create' && field.hideInCreate) return;
      if (mode === 'edit' && field.hideInEdit) return;
      if (mode === 'view' && field.hideInView) return;
      if (record && record[field.key] !== undefined) {
        data[field.key] = record[field.key];
      } else {
        data[field.key] = field.defaultValue ?? (field.type === 'switch' ? false : '');
      }
    });
    return data;
  }, [crud]);

  const openCreateForm = useCallback(() => {
    setCurrentRecord(null);
    setFormMode('create');
    setFormData(buildInitialFormData('create'));
    setFormErrors({});
    setFormOpen(true);
  }, [buildInitialFormData]);

  const openEditForm = useCallback((record: any) => {
    setCurrentRecord(record);
    setFormMode('edit');
    setFormData(buildInitialFormData('edit', record));
    setFormErrors({});
    setFormOpen(true);
  }, [buildInitialFormData]);

  const openViewForm = useCallback((record: any) => {
    setCurrentRecord(record);
    setFormMode('view');
    setFormData(buildInitialFormData('view', record));
    setFormErrors({});
    setFormOpen(true);
  }, [buildInitialFormData]);

  const handleDelete = useCallback(
    async (record: any): Promise<boolean> => {
      if (!crud) return false;
      const rowId = getRowId ? getRowId(record) : (record as Record<string, unknown>).id;
      if (!rowId) return false;
      if (!confirm(`确定要删除这条记录吗？此操作不可恢复。`)) return false;
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
  }, []);

  const handleFormSubmit = useCallback(
    async (data: any): Promise<boolean> => {
      if (!crud) return false;
      setFormSubmitting(true);
      try {
        if (formMode === 'create') {
          await crudResult.createMutation.mutateAsync(data);
        } else if (formMode === 'edit' && currentRecord?.id) {
          await crudResult.updateMutation.mutateAsync({ id: String(currentRecord.id), item: data });
        }
        setFormOpen(false);
        return true;
      } catch {
        return false;
      } finally {
        setFormSubmitting(false);
      }
    },
    [crud, formMode, currentRecord, crudResult]
  );

  // 表单验证
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

      // 必填验证（从 required 字段或 rules 中的 required 类型）
      const isRequired = field.required || field.rules?.some((r) => r.type === 'required');
      if (isRequired) {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          const rule = field.rules?.find((r) => r.type === 'required');
          errors[field.key] = rule?.message || `${field.label}不能为空`;
          return;
        }
      }

      // 跳过空值的其他验证
      if (value === undefined || value === null || value === '') return;

      // 其他规则验证
      if (field.rules) {
        for (const rule of field.rules) {
          if (rule.type === 'required') continue; // 已处理

          if (rule.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors[field.key] = rule.message || '请输入有效的邮箱地址';
              break;
            }
          }

          if (rule.type === 'number') {
            if (isNaN(Number(value))) {
              errors[field.key] = rule.message || '请输入有效的数字';
              break;
            }
          }

          if (rule.type === 'min') {
            if (Number(value) < (rule.min ?? 0)) {
              errors[field.key] = rule.message || `不能小于${rule.min}`;
              break;
            }
          }

          if (rule.type === 'max') {
            if (Number(value) > (rule.max ?? Infinity)) {
              errors[field.key] = rule.message || `不能大于${rule.max}`;
              break;
            }
          }

          if (rule.type === 'minLength') {
            if (String(value).length < (rule.minLength ?? 0)) {
              errors[field.key] = rule.message || `最少${rule.minLength}个字符`;
              break;
            }
          }

          if (rule.type === 'maxLength') {
            if (String(value).length > (rule.maxLength ?? Infinity)) {
              errors[field.key] = rule.message || `最多${rule.maxLength}个字符`;
              break;
            }
          }

          if (rule.type === 'pattern' && rule.pattern) {
            if (!rule.pattern.test(String(value))) {
              errors[field.key] = rule.message || '格式不正确';
              break;
            }
          }

          if (rule.validator) {
            const result = rule.validator(value);
            if (result !== true) {
              errors[field.key] = typeof result === 'string' ? result : rule.message || '验证失败';
              break;
            }
          }
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [crud?.formFields, formData, formMode]);

  // 自动表单提交（formFields 模式）
  const handleAutoFormSubmit = useCallback(async (): Promise<boolean> => {
    if (!crud) return false;
    // 先验证
    if (!validateForm()) return false;
    const submitData = crud.transformFormData
      ? crud.transformFormData(formData, formMode === 'create' ? 'create' : 'edit')
      : formData;
    return handleFormSubmit(submitData);
  }, [crud, formData, formMode, handleFormSubmit, validateForm]);

  // 渲染自动表单内容（formFields 模式）
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

    const renderField = (field: (typeof crud.formFields)[number]): React.ReactNode => {
      const value = formData[field.key];
      const disabled = field.disabled || formMode === 'view' || (field.disabledWhen && field.disabledWhen(formData));
      const error = formErrors[field.key];

      const formatValue = (val: unknown, fieldType: string): React.ReactNode => {
      if (val === null || val === undefined || val === '') return <span style={{ color: 'text.disabled' }}>-</span>;

      // 日期/时间格式化
      if (fieldType === 'date' && typeof val === 'string') {
        try {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          }
        } catch {
          // ignore
        }
      }

      // 数组值（checkbox 等）
      if (Array.isArray(val)) {
        return val.length > 0 ? val.join(', ') : <span style={{ color: 'text.disabled' }}>-</span>;
      }

      // switch 类型
      if (fieldType === 'switch') {
        return val ? (
          <Chip label='是' size='small' color='success' variant='outlined' />
        ) : (
          <Chip label='否' size='small' color='default' variant='outlined' />
        );
      }

      // select 类型带标签映射
      const fieldConfig = crud?.formFields?.find((f) => f.key === field.key);
      if (fieldConfig?.type === 'select' && fieldConfig.options) {
        const option = fieldConfig.options.find((opt) => opt.value === val);
        if (option) {
          const colorMap = fieldConfig.tableStatusColorMap || {};
          const color = (colorMap[val as string] || 'default') as 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
          return <Chip label={option.label} size='small' color={color} variant='outlined' />;
        }
      }

      return String(val);
    };

    // view 模式下的信息卡片式渲染
    if (formMode === 'view' && !field.render) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            py: 1,
          }}
        >
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {field.label}
          </Typography>
          <Box sx={{ minHeight: 24 }}>
            {formatValue(value, field.type)}
          </Box>
        </Box>
      );
    }

    if (field.render) {
      return field.render({ value, onChange: (v) => handleFieldChange(field.key, v), mode: formMode });
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
            <TextField
              fullWidth
              size='small'
              label={field.label}
              type={field.type}
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              error={!!error}
              helperText={error}
              slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
            />
          );
        case 'number':
          return (
            <TextField
              fullWidth
              size='small'
              label={field.label}
              type='number'
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              error={!!error}
              helperText={error}
              slotProps={{
                input: {
                  inputProps: {
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    readOnly: formMode === 'view',
                  },
                },
              }}
            />
          );
        case 'numberRange':
          return (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size='small'
                label={`${field.label}（最小）`}
                type='number'
                value={(value as any)?.min ?? ''}
                onChange={(e) =>
                  handleFieldChange(field.key, { ...((value as any) || {}), min: e.target.value })
                }
                placeholder='最小值'
                disabled={disabled}
                slotProps={{
                  input: {
                    inputProps: {
                      min: field.min,
                      max: field.max,
                      step: field.step,
                      readOnly: formMode === 'view',
                    },
                  },
                }}
              />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                ~
              </Typography>
              <TextField
                fullWidth
                size='small'
                label={`${field.label}（最大）`}
                type='number'
                value={(value as any)?.max ?? ''}
                onChange={(e) =>
                  handleFieldChange(field.key, { ...((value as any) || {}), max: e.target.value })
                }
                placeholder='最大值'
                disabled={disabled}
                slotProps={{
                  input: {
                    inputProps: {
                      min: field.min,
                      max: field.max,
                      step: field.step,
                      readOnly: formMode === 'view',
                    },
                  },
                }}
              />
            </Box>
          );
        case 'textarea':
          return (
            <TextField
              fullWidth
              size='small'
              label={field.label}
              multiline
              rows={field.rows ?? 3}
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              disabled={disabled}
              error={!!error}
              helperText={error}
              slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
            />
          );
        case 'select':
          return (
            <FormControl fullWidth size='small' disabled={disabled} error={!!error}>
              <InputLabel>{field.label}</InputLabel>
              <Select
                value={value ?? ''}
                label={field.label}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                readOnly={formMode === 'view'}
              >
                {field.options?.map((opt) => (
                  <MenuItem key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {error && (
                <FormHelperText>{error}</FormHelperText>
              )}
            </FormControl>
          );
        case 'radio':
          return (
            <FormControl component='fieldset' disabled={disabled} error={!!error}>
              <Typography variant='body2' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {field.label}
                {field.required && <span style={{ color: 'error.main' }}> *</span>}
              </Typography>
              <RadioGroup
                value={value ?? ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                row={field.optionLayout === 'horizontal'}
              >
                {field.options?.map((opt) => (
                  <FormControlLabel
                    key={String(opt.value)}
                    value={opt.value}
                    control={<Radio size='small' />}
                    label={opt.label}
                  />
                ))}
              </RadioGroup>
              {error && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
          );
        case 'checkbox':
          return (
            <FormControl component='fieldset' disabled={disabled} error={!!error}>
              <Typography variant='body2' sx={{ mb: 0.5, color: 'text.secondary' }}>
                {field.label}
                {field.required && <span style={{ color: 'error.main' }}> *</span>}
              </Typography>
              <FormGroup row={field.optionLayout === 'horizontal'}>
                {field.options?.map((opt) => {
                  const checked = Array.isArray(value) && value.includes(opt.value);
                  return (
                    <FormControlLabel
                      key={String(opt.value)}
                      control={
                        <Checkbox
                          size='small'
                          checked={checked}
                          onChange={(e) => {
                            const arr = Array.isArray(value) ? [...value] : [];
                            if (e.target.checked) {
                              arr.push(opt.value);
                            } else {
                              const idx = arr.indexOf(opt.value);
                              if (idx > -1) arr.splice(idx, 1);
                            }
                            handleFieldChange(field.key, arr);
                          }}
                        />
                      }
                      label={opt.label}
                    />
                  );
                })}
              </FormGroup>
              {error && <FormHelperText>{error}</FormHelperText>}
            </FormControl>
          );
        case 'switch':
          return (
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                  disabled={disabled}
                />
              }
              label={field.label}
            />
          );
        case 'date':
          return (
            <TextField
              fullWidth
              size='small'
              label={field.label}
              type='date'
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              required={field.required}
              disabled={disabled}
              error={!!error}
              helperText={error}
              slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
            />
          );
        default:
          return null;
      }
    };

    // 按分组整理字段
    const groups = crud.formGroups || [];
    const hasGroups = groups.length > 0 && visibleFields.some((f) => f.group);

    const renderFieldGroup = (fields: typeof visibleFields) => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
          gap: 2,
        }}
      >
        {fields.map((field) => (
          <Box key={field.key} sx={{ gridColumn: `span ${field.colSpan ?? 1}` }}>
            {renderField(field)}
          </Box>
        ))}
      </Box>
    );

    return (
      <Box
        component='form'
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (formMode !== 'view') handleAutoFormSubmit();
        }}
      >
        {hasGroups ? (
          <>
            {groups.map((group) => {
              const groupFields = visibleFields.filter((f) => f.group === group.key);
              if (groupFields.length === 0) return null;
              return (
                <Box key={group.key}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {group.title}
                    </Typography>
                    {group.description && (
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {group.description}
                      </Typography>
                    )}
                  </Box>
                  {renderFieldGroup(groupFields)}
                </Box>
              );
            })}
            {/* 未分组的字段放在最后 */}
            {(() => {
              const ungroupedFields = visibleFields.filter((f) => !f.group || !groups.some((g) => g.key === f.group));
              if (ungroupedFields.length === 0) return null;
              return (
                <Box>
                  {groups.length > 0 && <Divider sx={{ my: 2 }} />}
                  {renderFieldGroup(ungroupedFields)}
                </Box>
              );
            })()}
          </>
        ) : (
          renderFieldGroup(visibleFields)
        )}
        <input type='submit' style={{ display: 'none' }} />
      </Box>
    );
  }, [crud, formMode, formData, handleAutoFormSubmit]);

  // 最终表单内容：renderForm 优先级高于 formFields
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

  // 是否有表单（renderForm 或 formFields）
  const hasForm = !!(crud?.renderForm || crud?.formFields);

  // crud 模式下自动推断行点击行为
  const resolvedOnRowClick = useMemo(() => {
    if (onRowClick) return onRowClick;
    if (crud && hasForm && crud.clickRowToView !== false) {
      return (row: T) => openViewForm(row);
    }
    return undefined;
  }, [onRowClick, crud, hasForm, openViewForm]);

  // crud 模式下自动推断双击行编辑行为
  const resolvedOnRowDoubleClick = useMemo(() => {
    if (crud && hasForm && crud.doubleClickToEdit !== false) {
      return (row: T) => openEditForm(row);
    }
    return undefined;
  }, [crud, hasForm, openEditForm]);

  // crud 模式下，若提供了表单配置且未传自定义 actions，则自动添加新建按钮
  const effectiveActions = useMemo(() => {
    if (!hasForm || !crud || crud.showCreateButton === false) return actions;
    const createAction = {
      label: crud.createButtonText || '新建',
      icon: <Plus size={18} />,
      variant: 'contained' as const,
      onClick: openCreateForm,
    };
    return actions ? [...actions, createAction] : [createAction];
  }, [crud, actions, openCreateForm, hasForm]);

  // 兼容旧版扁平化分页属性；启用 internalListState 时用内部状态补全
  const resolvedPagination =
    pagination ||
    (page !== undefined && pageSize !== undefined && total !== undefined
      ? {
          page,
          pageSize,
          total,
          onPageChange: onPageChange || (() => {}),
          onPageSizeChange,
        }
      : internalListStateResult
        ? {
            page: internalListStateResult.currentPage,
            pageSize: internalListStateResult.pageSize,
            total: resolvedTotal,
            onPageChange: (p: number) => {
              internalListStateResult.setCurrentPage(p);
              onPageChange?.(p);
              if (crud) crudResult.fetch(buildCrudFetchParams());
            },
            onPageSizeChange: (s: number) => {
              internalListStateResult.setPageSize(s);
              onPageSizeChange?.(s);
              if (crud) crudResult.fetch(buildCrudFetchParams());
            },
          }
        : undefined);

  // 兼容旧版 onSearchChange
  const resolvedOnSearch = onSearch || onSearchChange;

  // 兼容旧版 filterContent
  const resolvedHeaderContent = filterContent ? (
    <>
      {headerContent}
      {filterContent}
    </>
  ) : (
    headerContent
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const autoItems = useAutoBreadcrumbs({
    includeHome: true,
  });

  const breadcrumbs =
    manualBreadcrumbs && manualBreadcrumbs.length > 0
      ? manualBreadcrumbs
      : autoBreadcrumbs
        ? autoItems
        : undefined;

  const [sortBy, setSortBy] = useState(defaultSortBy || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  // searchInput：
  // - 受控模式（searchValue 传入）：以外部值为准
  // - internalListState 模式：以内部 searchQuery 为准
  // - 否则：本地 useState + persistSearch
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
  const searchInput = searchValue !== undefined
    ? searchValue
    : internalListStateResult
      ? internalListStateResult.searchQuery
      : localSearchInput;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // 批量选择状态 - 从 localStorage 恢复
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

  // 批量操作状态
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

  // 批量操作取消控制器
  const batchAbortController = useRef<AbortController | null>(null);

  // 批量操作确认对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    onClick: (selectedRows: T[]) => void;
    label: string;
  } | null>(null);

  // 行展开状态
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>(defaultExpandedIds);

  // 内部 columnConfig 状态（延迟初始化，首次渲染后根据 resolvedColumns 同步）
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);

  // 初始化 columnConfig（使用 resolvedColumns，支持 crud 自动生成的列）
  const columnConfigInitialized = useRef(false);
  useEffect(() => {
    if (columnConfigInitialized.current) return;
    if (defaultColumnConfig.length > 0) {
      setColumnConfig(defaultColumnConfig);
      columnConfigInitialized.current = true;
      return;
    }
    if (persistColumnConfig) {
      const stored = loadColumnConfig(columnConfigStorageKey);
      if (stored.length > 0) {
        setColumnConfig(stored);
        columnConfigInitialized.current = true;
        return;
      }
    }
    const cols = resolvedColumns || [];
    setColumnConfig(cols.map((col, index) => ({
      id: col.id,
      visible: true,
      order: col.order ?? index,
    })));
    columnConfigInitialized.current = true;
  }, [resolvedColumns, defaultColumnConfig, persistColumnConfig, columnConfigStorageKey]);

  // 列配置 Popover 状态
  const [columnConfigAnchor, setColumnConfigAnchor] = useState<HTMLElement | null>(null);

  // 导出状态
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);

  // URL 同步列配置（当 columnConfig prop 启用时）
  const urlColSyncEnabled = columnConfigProp?.urlSync && columnConfigProp.key;
  const columnConfigResult = useColumnConfig({
    storageKey: urlColSyncEnabled ? columnConfigProp!.key : undefined,
    defaultColumns: columns.map((col, idx) => ({
      id: col.id,
      visible: true,
      order: col.order ?? idx,
    })),
    urlSync: urlColSyncEnabled ? columnConfigProp!.urlSync : false,
    urlPrefix: columnConfigProp?.urlPrefix,
  });

  // 将内部 columnConfig 转换为可见列 ID 数组（按顺序）
  const visibleIdsFromConfig = (cfg: ColumnConfig[]): string[] => {
    return [...cfg]
      .filter((c) => c.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => c.id);
  };

  // 从 URL/useColumnConfig 同步到内部 columnConfig state（URL 优先级最高）
  useEffect(() => {
    if (!urlColSyncEnabled) return;
    const urlIds = columnConfigResult.visibleColumnIds;
    if (urlIds.length === 0) return;
    // 检查是否与当前内部状态不同
    const currentIds = visibleIdsFromConfig(columnConfig);
    if (urlIds.join(',') === currentIds.join(',')) return;

    // 用 URL 中的顺序和可见性重建 columnConfig
    setColumnConfig((prev) => {
      const result: ColumnConfig[] = [];
      // 先加 URL 中出现的列（可见，按 URL 顺序）
      urlIds.forEach((id, idx) => {
        const existing = prev.find((c) => c.id === id);
        result.push({
          id,
          visible: true,
          order: idx,
        });
      });
      // 再加 URL 中没有的列（隐藏，追加在后面）
      const hiddenCols = prev.filter((c) => !urlIds.includes(c.id));
      hiddenCols.forEach((c, idx) => {
        result.push({
          ...c,
          visible: false,
          order: urlIds.length + idx,
        });
      });
      return result;
    });
  }, [columnConfigResult.visibleColumnIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // 内部 columnConfig 变化时同步回 useColumnConfig（写 URL 和 localStorage）
  useEffect(() => {
    if (!urlColSyncEnabled) return;
    const ids = visibleIdsFromConfig(columnConfig);
    if (ids.join(',') !== columnConfigResult.visibleColumnIds.join(',')) {
      columnConfigResult.reorderColumns(ids);
    }
  }, [columnConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // 列配置持久化
  useEffect(() => {
    if (persistColumnConfig && !urlColSyncEnabled) {
      saveColumnConfig(columnConfigStorageKey, columnConfig);
    }
  }, [columnConfig, persistColumnConfig, columnConfigStorageKey, urlColSyncEnabled]);

  // 批量选择状态持久化
  useEffect(() => {
    const key = filterStorageKey || window.location.pathname;
    try {
      localStorage.setItem(`listpage:selectedIds:${key}`, JSON.stringify([...selectedIds]));
    } catch {
      // ignore
    }
  }, [selectedIds, filterStorageKey]);

  // 筛选状态
  // - internalListState 启用时：使用 internalListStateResult.filters（支持 URL 同步）
  // - 否则：使用本地 state（支持 localStorage 持久化）
  const [localFiltersState, setLocalFiltersState] = useState<Record<string, any>>(() => {
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
    ? (internalListStateResult.filters as Record<string, any>)
    : localFiltersState;

  const setLocalFilters = useCallback(
    (newFilters: Record<string, any>) => {
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
      localStorage.setItem(`listpage:filters:${key}`, JSON.stringify(localFilters));
    }
  }, [localFilters, persistFilters, filterStorageKey, onFilterChange]);

  useEffect(() => {
    if (persistSearch) {
      const key = filterStorageKey || window.location.pathname;
      localStorage.setItem(`listpage:search:${key}`, searchInput);
    }
  }, [searchInput, persistSearch, filterStorageKey]);

  // 批量选择逻辑（crud 模式下自动启用 selectable）
  const resolvedBatchActions = useMemo(() => {
    if (!crud) return batchActions;
    const builtInActions: BatchAction<T>[] = [];
    if (crud.selectable && crudResult?.bulkDelete) {
      builtInActions.push({
        label: '批量删除',
        icon: null,
        color: 'error',
        onClick: (selectedRows: T[]) => {
          const ids = selectedRows.map((row: any) => row.id).filter(Boolean);
          if (ids.length === 0) return;
          if (confirm(`确定删除选中的 ${ids.length} 条记录吗？`)) {
            crudResult.bulkDelete(ids as string[]);
          }
        },
      });
    }
    return [...builtInActions, ...(crud.bulkActions || []), ...(batchActions || [])];
  }, [crud, crudResult, batchActions]);

  const hasBatchActions = resolvedBatchActions && resolvedBatchActions.length > 0;
  const crudSelectable = crud?.selectable ?? false;
  const isBatchSelectionEnabled = enableBatchSelection || hasBatchActions || crudSelectable;

  // crud 模式下自动生成行操作（查看/编辑/删除）
  const resolvedRowActions = useMemo(() => {
    if (!crud || !hasForm) return rowActions;
    const builtInActions: RowAction<T>[] = [];
    builtInActions.push({
      key: 'edit',
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row: T) => openEditForm(row),
    });
    builtInActions.push({
      key: 'delete',
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (row: T) => handleDelete(row),
    });
    return [...builtInActions, ...(crud.rowActions || []), ...(rowActions || [])];
  }, [crud, hasForm, rowActions, openEditForm, handleDelete]);

  const handleBatchSelect = useCallback(
    (row: T, event?: React.MouseEvent) => {
      const rowId = getRowId(row);
      if (event?.ctrlKey || event?.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        });
      } else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(rowId)) {
            next.delete(rowId);
          } else {
            next.add(rowId);
          }
          return next;
        });
      }
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

  // 键盘快捷键支持
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
    setBatchOperationState((prev) => ({
      ...prev,
      isCancelled: true,
    }));
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

  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setLocalFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [setLocalFilters, onFilterChange]
  );

  const handleQuickFilter = useCallback(
    (quickFilter: { filters: Record<string, any>; searchValue?: string }) => {
      setLocalFilters(quickFilter.filters);
      onFilterChange?.(quickFilter.filters);
      if (quickFilter.searchValue !== undefined) {
        if (internalListStateResult) {
          internalListStateResult.setSearchQuery(quickFilter.searchValue);
        } else {
          setLocalSearchInput(quickFilter.searchValue);
        }
        resolvedOnSearch?.(quickFilter.searchValue);
      }
    },
    [setLocalFilters, onFilterChange, resolvedOnSearch, internalListStateResult]
  );

  // 快速筛选 URL 同步（仅 urlSync 启用时）
  const isQuickFilterUrlSyncEnabled = !!effectiveListState?.urlSync;
  const qfUrlKey = `${effectiveListState?.urlPrefix ?? ''}qf`;
  const [activeQuickFilterKey, setActiveQuickFilterKey] = useUrlState<string | null>(qfUrlKey, null, {
    mode: isQuickFilterUrlSyncEnabled ? (effectiveListState!.urlSync as 'replace' | 'push') : 'replace',
    removeDefault: true,
  });

  // 点击快速筛选时更新 URL 和激活态
  const effectiveOnQuickFilter = useCallback(
    (quickFilter: { key?: string; filters: Record<string, any>; searchValue?: string }) => {
      const key = quickFilter.key ?? null;
      if (isQuickFilterUrlSyncEnabled) {
        setActiveQuickFilterKey(key);
      }
      handleQuickFilter({ filters: quickFilter.filters, searchValue: quickFilter.searchValue });
    },
    [isQuickFilterUrlSyncEnabled, setActiveQuickFilterKey, handleQuickFilter]
  );

  // URL 中 qf 变化时（前进后退），自动应用对应的快速筛选
  useEffect(() => {
    if (!isQuickFilterUrlSyncEnabled || !quickFilters || !activeQuickFilterKey) return;
    const matched = quickFilters.find((qf, idx) => (qf.key ?? String(idx)) === activeQuickFilterKey);
    if (matched) {
      handleQuickFilter({ filters: matched.filters, searchValue: matched.searchValue });
    }
  }, [activeQuickFilterKey, isQuickFilterUrlSyncEnabled, quickFilters, handleQuickFilter]);

  // ---- 视图模式 ----
  // 可用的视图模式：传入 viewModesProp 时使用，否则根据是否有 renderCardView/renderCardItem/cardViewConfig 判断
  const effectiveViewModes: ListViewMode[] = useMemo(() => {
    if (viewModesProp?.length) return viewModesProp;
    const hasCardView = !!renderCardView || !!renderCardItem || !!resolvedCardViewConfig;
    return hasCardView ? ['table', 'card'] : ['table'];
  }, [viewModesProp, renderCardView, renderCardItem, resolvedCardViewConfig]);

  // 视图模式 URL 同步（仅 urlSync 启用时）
  const isViewModeUrlSyncEnabled = !!effectiveListState?.urlSync && effectiveViewModes.length > 1;
  const viewModeUrlKey = `${effectiveListState?.urlPrefix ?? ''}view`;
  const [viewModeUrlState, setViewModeUrlState] = useUrlState<ListViewMode>(viewModeUrlKey, defaultViewMode, {
    mode: isViewModeUrlSyncEnabled ? (effectiveListState!.urlSync as 'replace' | 'push') : 'replace',
    removeDefault: true,
  });

  // 视图模式本地 state（非受控模式）
  const [viewModeLocal, setViewModeLocal] = useState<ListViewMode>(defaultViewMode);

  // 计算当前视图模式
  const effectiveViewMode: ListViewMode = useMemo(() => {
    // 受控模式优先级最高
    if (viewModeProp) return viewModeProp;
    // URL 同步模式
    if (isViewModeUrlSyncEnabled) return viewModeUrlState;
    // 非受控模式
    return viewModeLocal;
  }, [viewModeProp, isViewModeUrlSyncEnabled, viewModeUrlState, viewModeLocal]);

  // 切换视图模式
  const handleViewModeChange = useCallback(
    (mode: ListViewMode) => {
      // 受控模式
      if (viewModeProp) {
        onViewModeChange?.(mode);
        return;
      }
      // URL 同步模式
      if (isViewModeUrlSyncEnabled) {
        setViewModeUrlState(mode);
        onViewModeChange?.(mode);
        return;
      }
      // 非受控模式
      setViewModeLocal(mode);
      onViewModeChange?.(mode);
    },
    [viewModeProp, isViewModeUrlSyncEnabled, setViewModeUrlState, onViewModeChange]
  );

  // 获取可见的列（按order排序）
  const visibleColumns = useMemo(() => {
    if (!columnConfigurable) return resolvedColumns;

    const sortedColumns = [...resolvedColumns].sort((a, b) => {
      const orderA = columnConfig.find((c) => c.id === a.id)?.order ?? a.order ?? 0;
      const orderB = columnConfig.find((c) => c.id === b.id)?.order ?? b.order ?? 0;
      return orderA - orderB;
    });

    return sortedColumns.filter((col) => {
      const config = columnConfig.find((c) => c.id === col.id);
      return config ? config.visible : true;
    });
  }, [resolvedColumns, columnConfig, columnConfigurable]);

  const effectiveSelectedIds = Array.from(selection?.selected ?? selectedIds);
  const effectiveOnSelectionChange = selection?.onChange ?? onSelectionChange;

  // crud 模式下选中变化时触发 onSelectionChange 回调
  useEffect(() => {
    if (!crud?.onSelectionChange) return;
    const selectedRows = data.filter((row) =>
      effectiveSelectedIds.includes(getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number)
    );
    crud.onSelectionChange(effectiveSelectedIds, selectedRows);
  }, [effectiveSelectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理排序
  const handleSort = useCallback(
    (columnId: string) => {
      const newOrder = sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc';
      setSortBy(columnId);
      setSortOrder(newOrder);
      onSort?.(columnId, newOrder);
    },
    [sortBy, sortOrder, onSort]
  );

  // 处理选择
  const handleSelectAll = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.checked) {
        const allIds = data.map((row) => getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number);
        effectiveOnSelectionChange?.(allIds);
      } else {
        effectiveOnSelectionChange?.([]);
      }
    },
    [data, getRowId, effectiveOnSelectionChange]
  );

  const handleSelectRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const newSelected = effectiveSelectedIds.includes(rowId)
        ? effectiveSelectedIds.filter((id) => id !== rowId)
        : [...effectiveSelectedIds, rowId];
      effectiveOnSelectionChange?.(newSelected);
    },
    [effectiveSelectedIds, getRowId, effectiveOnSelectionChange]
  );

  // 处理搜索
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (internalListStateResult) {
        internalListStateResult.setSearchQuery(value);
      } else {
        setLocalSearchInput(value);
      }
      resolvedOnSearch?.(value);
    },
    [resolvedOnSearch, internalListStateResult]
  );

  // 防抖搜索值变化时通知外部（仅 internalListState 模式）
  useEffect(() => {
    if (internalListStateResult && onDebouncedSearch) {
      onDebouncedSearch(internalListStateResult.debouncedSearch);
    }
  }, [internalListStateResult?.debouncedSearch, onDebouncedSearch, internalListStateResult]);

  // 处理行操作菜单
  const handleRowActionClick = useCallback((event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  }, []);

  const handleRowActionClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedRow(null);
  }, []);

  const handleRowAction = useCallback(
    (action: RowAction<T>) => {
      if (selectedRow) {
        action.onClick?.(selectedRow);
      }
      handleRowActionClose();
    },
    [selectedRow, handleRowActionClose]
  );

  // 处理行展开
  const handleExpandRow = useCallback(
    (row: T) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const newExpanded = expandedIds.includes(rowId)
        ? expandedIds.filter((id) => id !== rowId)
        : [...expandedIds, rowId];
      setExpandedIds(newExpanded);
      onExpandedChange?.(newExpanded);
    },
    [expandedIds, getRowId, onExpandedChange]
  );

  // 处理列配置变化
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

  // 处理列配置批量变更（全选/全不选）
  const handleColumnConfigChange = useCallback(
    (config: ColumnConfig[]) => {
      setColumnConfig(config);
      onColumnConfigChange?.(config);
    },
    [onColumnConfigChange]
  );

  // 重置列配置
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

  // crud 模式下自动推断导出配置
  const resolvedExportable = useMemo(() => {
    if (exportable !== undefined) return exportable;
    if (crud?.exportable) return true;
    return false;
  }, [exportable, crud]);

  const resolvedExportFileName = useMemo(() => {
    if (exportFileName) return exportFileName;
    if (crud?.exportFileName) return crud.exportFileName;
    if (crud?.entityName) return crud.entityName;
    if (title) return title;
    return 'export';
  }, [exportFileName, crud, title]);

  const resolvedExportFormats = useMemo((): Array<'csv' | 'excel' | 'json'> => {
    if (exportFormats?.length) return exportFormats as Array<'csv' | 'excel' | 'json'>;
    if (crud?.exportFormats?.length) return crud.exportFormats as Array<'csv' | 'excel' | 'json'>;
    return ['csv', 'json'];
  }, [exportFormats, crud]);

  const resolvedExportScopes = useMemo((): Array<'current' | 'all' | 'selected'> => {
    if (exportScopes?.length) return exportScopes as Array<'current' | 'all' | 'selected'>;
    if (crud?.exportScopes?.length) return crud.exportScopes as Array<'current' | 'all' | 'selected'>;
    return ['current', 'all', 'selected'];
  }, [exportScopes, crud]);

  // 导出列（crud 模式下从 formFields 自动生成）
  const resolvedExportColumns = useMemo(() => {
    if (exportColumns?.length) return exportColumns;
    if (crud?.formFields) {
      return crud.formFields
        .filter((f) => !f.hideInExport && f.key !== 'id')
        .map((f) => f.key);
    }
    return visibleColumns.map((c) => c.id);
  }, [exportColumns, crud, visibleColumns]);

  // 导出功能
  const handleExport = useCallback(
    async (format: 'csv' | 'excel' | 'json' = 'csv', scope: 'current' | 'all' | 'selected' = 'current') => {
      if (!resolvedExportable || exporting) return;

      try {
        setExporting(true);
        setExportAnchorEl(null);

        // 确定导出数据范围
        let exportDataRows: T[] = [];
        if (scope === 'selected') {
          exportDataRows = data.filter((row) =>
            effectiveSelectedIds.includes(getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number)
          );
        } else if (scope === 'current') {
          exportDataRows = data;
        } else {
          exportDataRows = data;
        }

        if (exportDataRows.length === 0) {
          logger.warn('没有可导出的数据');
          setExporting(false);
          return;
        }

        // 获取导出列的标签和 id
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

        // 转换数据
        const transformedRows = exportDataRows.map((row) => {
          const transformed = exportTransform
            ? exportTransform(row)
            : (row as unknown as Record<string, unknown>);
          const result: Record<string, unknown> = {};
          exportColDefs.forEach(({ id }) => {
            let value = transformed[id];
            // crud 模式下应用 exportFormat
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
        let mimeType: string;

        if (format === 'json') {
          const jsonContent = JSON.stringify(transformedRows, null, 2);
          blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
          ext = 'json';
          mimeType = 'application/json';
        } else {
          // CSV / Excel 格式
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
          mimeType = format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
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
        logger.error('导出失败:', error);
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

  // 计算固定列的 left/right 位置
  const fixedColumnPositions = useMemo(() => {
    const leftPositions: Record<string, number> = {};
    const rightPositions: Record<string, number> = {};
    let leftOffset = 0;
    let rightOffset = 0;

    // 左侧固定列：选择框 + 行号 + 左侧固定列
    if (selectable || isBatchSelectionEnabled) leftOffset += 48;
    if (showRowNumber) leftOffset += 60;
    if (resolvedTreeView) leftOffset += 48;

    const leftFixed = visibleColumns.filter((col) => col.fixed === 'left');
    leftFixed.forEach((col) => {
      leftPositions[col.id] = leftOffset;
      const w = columnWidthResult.getColumnWidth(col.id);
      leftOffset += typeof w === 'number' ? w : 150;
    });

    // 右侧固定列：操作列 + 列配置 + 右侧固定列
    if (resolvedRowActions && resolvedRowActions.length > 0) rightOffset += 80;
    if (columnConfigurable) rightOffset += 48;

    const rightFixed = [...visibleColumns].filter((col) => col.fixed === 'right').reverse();
    rightFixed.forEach((col) => {
      rightPositions[col.id] = rightOffset;
      const w = columnWidthResult.getColumnWidth(col.id);
      rightOffset += typeof w === 'number' ? w : 150;
    });

    return { leftPositions, rightPositions };
  }, [
    visibleColumns,
    selectable,
    isBatchSelectionEnabled,
    showRowNumber,
    resolvedTreeView,
    resolvedRowActions,
    columnConfigurable,
    columnWidthResult,
  ]);

  // 渲染表格头部
  const renderTableHead = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={
                effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < data.length
              }
              checked={data.length > 0 && effectiveSelectedIds.length === data.length}
              onChange={handleSelectAll}
            />
          </TableCell>
        )}
        {isBatchSelectionEnabled && !selectable && (
          <TableCell
            padding='checkbox'
            sx={{
              width: 48,
              position: 'sticky',
              left: 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            <Checkbox
              indeterminate={selectedIds.size > 0 && selectedIds.size < data.length}
              checked={data.length > 0 && selectedIds.size === data.length}
              onChange={handleBatchSelectAll}
            />
          </TableCell>
        )}
        {showRowNumber && (
          <TableCell
            sx={{
              width: 60,
              position: selectable ? 'sticky' : 'relative',
              left: selectable ? 48 : 0,
              zIndex: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
            }}
          >
            #
          </TableCell>
        )}
        {expandable && (
          <TableCell
            padding='checkbox'
            sx={{ width: 48 }}
          />
        )}
        {visibleColumns.map((column) => {
          const colWidth = resolvedColumnResizable
            ? columnWidthResult.getColumnWidth(column.id)
            : column.width;
          const isResizing = columnWidthResult.resizingColumnId === column.id;
          const canResize = resolvedColumnResizable && column.resizable !== false;
          const isFixed = column.fixed !== undefined;
          const leftPos = fixedColumnPositions.leftPositions[column.id];
          const rightPos = fixedColumnPositions.rightPositions[column.id];

          return (
            <TableCell
              key={column.id}
              align={column.align || 'left'}
              width={colWidth}
              sx={{
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                position: isFixed ? 'sticky' : 'relative',
                left: column.fixed === 'left' ? leftPos : undefined,
                right: column.fixed === 'right' ? rightPos : undefined,
                zIndex: isFixed ? 2 : 1,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: column.align === 'center' ? 'center' : column.align === 'right' ? 'flex-end' : 'flex-start' }}>
                {column.renderHeader ? (
                  column.renderHeader(column)
                ) : sortable && column.sortable !== false ? (
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortOrder : 'asc'}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label || column.header}
                  </TableSortLabel>
                ) : (
                  column.label || column.header
                )}
              </Box>
              {canResize && (
                <Box
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    columnWidthResult.startResize(column.id, e.clientX);
                  }}
                  onDoubleClick={() => columnWidthResult.resetColumnWidth(column.id)}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    cursor: 'col-resize',
                    bgcolor: isResizing ? 'primary.main' : 'transparent',
                    transition: 'background-color 0.2s',
                    '&:hover': {
                      bgcolor: 'primary.main',
                    },
                    zIndex: 3,
                  }}
                  title='拖拽调整列宽，双击重置'
                />
              )}
            </TableCell>
          );
        })}
        {resolvedRowActions && resolvedRowActions.length > 0 && (
          <TableCell
            align='right'
            sx={{ width: 80 }}
          >
            操作
          </TableCell>
        )}
        {columnConfigurable && (
          <TableCell
            align='right'
            sx={{ width: 48 }}
          >
            <Tooltip title='配置列'>
              <IconButton
                size='small'
                onClick={(e) => setColumnConfigAnchor(e.currentTarget)}
              >
                <Columns3 style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  // 渲染展开行内容
  const renderExpandedRow = (row: T, index: number) => {
    if (typeof expandable === 'function') {
      return expandable(row, index);
    }
    return null;
  };

  // 渲染表格内容
  const renderTableBody = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          {selectable && (
            <TableCell padding='checkbox'>
              <Skeleton
                variant='rectangular'
                width={20}
                height={20}
              />
            </TableCell>
          )}
          {showRowNumber && (
            <TableCell>
              <Skeleton
                variant='text'
                width={30}
              />
            </TableCell>
          )}
          {expandable && (
            <TableCell padding='checkbox'>
              <Skeleton
                variant='rectangular'
                width={20}
                height={20}
              />
            </TableCell>
          )}
          {visibleColumns.map((column) => (
            <TableCell key={column.id}>
              <Skeleton
                variant='text'
                width='80%'
              />
            </TableCell>
          ))}
          {resolvedRowActions && resolvedRowActions.length > 0 && (
            <TableCell>
              <Skeleton
                variant='text'
                width={60}
              />
            </TableCell>
          )}
          {columnConfigurable && <TableCell />}
        </TableRow>
      ));
    }

    if (error) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              visibleColumns.length +
              (selectable ? 1 : 0) +
              (showRowNumber ? 1 : 0) +
              (expandable ? 1 : 0) +
              (resolvedRowActions ? 1 : 0) +
              (columnConfigurable ? 1 : 0)
            }
            align='center'
            sx={{ py: 8 }}
          >
            <ErrorEmptyState
              error={error}
              onRetry={onRefresh}
            />
          </TableCell>
        </TableRow>
      );
    }

    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={
              visibleColumns.length +
              (selectable ? 1 : 0) +
              (showRowNumber ? 1 : 0) +
              (expandable ? 1 : 0) +
              (resolvedRowActions ? 1 : 0) +
              (columnConfigurable ? 1 : 0)
            }
            align='center'
            sx={{ py: 8 }}
          >
            <EmptyState
              icon={emptyIcon}
              title={emptyMessage}
              description='暂无数据，点击添加按钮创建新记录'
              action={
                emptyActionButton
                  ? { label: emptyActionButton.label, onClick: emptyActionButton.onClick }
                  : undefined
              }
            />
          </TableCell>
        </TableRow>
      );
    }

    return treeTableData.map((row, index) => {
      const rowId = getRowId?.(row) ?? (row as unknown as Record<string, unknown>).id as string | number;
      const isSelected = effectiveSelectedIds.includes(rowId);
      const isExpanded = expandedIds.includes(rowId);
      const rowLevel = resolvedTreeView ? getRowLevel(rowId) : 0;
      const rowHasChildren = hasChildren(row);
      const isEditing = resolvedEditingRowId === rowId;

      return (
        <React.Fragment key={rowId}>
          <TableRow
            hover
            selected={isSelected}
            onClick={() => resolvedOnRowClick?.(row)}
            onDoubleClick={() => resolvedOnRowDoubleClick?.(row)}
            sx={{
              '&:nth-of-type(even)': striped ? { bgcolor: 'action.hover' } : {},
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.08)' : 'primary.50',
                transition: 'background-color 150ms ease',
              },
              '&.Mui-selected': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.12)' : 'primary.50',
              },
              cursor: resolvedOnRowClick ? 'pointer' : 'default',
              transition: 'background-color 150ms ease',
            }}
          >
            {selectable && (
              <TableCell
                padding='checkbox'
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRow(row);
                  }}
                />
              </TableCell>
            )}
            {isBatchSelectionEnabled && !selectable && (
              <TableCell
                padding='checkbox'
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                <Checkbox
                  checked={selectedIds.has(rowId)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBatchSelect(row);
                  }}
                />
              </TableCell>
            )}
            {showRowNumber && (
              <TableCell
                sx={{
                  position: selectable ? 'sticky' : 'relative',
                  left: selectable ? 48 : 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {resolvedPagination
                  ? resolvedPagination.page * resolvedPagination.pageSize + index + 1
                  : index + 1}
              </TableCell>
            )}
            {expandable && !resolvedTreeView && (
              <TableCell padding='checkbox'>
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandRow(row);
                  }}
                >
                  <ChevronRight
                    style={{
                      width: 18,
                      height: 18,
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                </IconButton>
              </TableCell>
            )}
            {resolvedTreeView && (
              <TableCell
                padding='checkbox'
                sx={{
                  width: 48,
                  position: 'sticky',
                  left: (selectable || isBatchSelectionEnabled) ? 48 : 0,
                  zIndex: 1,
                  bgcolor: 'inherit',
                }}
              >
                {rowHasChildren ? (
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(rowId);
                    }}
                  >
                    <ChevronRight
                      style={{
                        width: 18,
                        height: 18,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </IconButton>
                ) : (
                  <Box sx={{ width: 24 }} />
                )}
              </TableCell>
            )}
            {visibleColumns.map((column) => {
              const isTreeColumn = resolvedTreeView && column.id === treeColumnId;
              const isFixed = column.fixed !== undefined;
              const leftPos = fixedColumnPositions.leftPositions[column.id];
              const rightPos = fixedColumnPositions.rightPositions[column.id];
              const colWidth = resolvedColumnResizable
                ? columnWidthResult.getColumnWidth(column.id)
                : column.width;
              const canEdit = resolvedInlineEditable && column.editable && !isTreeColumn;
              const cellValue = (row as unknown as Record<string, unknown>)[column.id];

              return (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  width={colWidth}
                  sx={{
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    position: isFixed ? 'sticky' : 'static',
                    left: column.fixed === 'left' ? leftPos : undefined,
                    right: column.fixed === 'right' ? rightPos : undefined,
                    zIndex: isFixed ? 1 : 0,
                    bgcolor: 'inherit',
                  }}
                  onClick={(e) => {
                    if (canEdit && resolvedInlineEditMode === 'cell') {
                      e.stopPropagation();
                      startEditing(row);
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      pl: isTreeColumn ? rowLevel * treeIndentSize : 0,
                    }}
                  >
                    {isTreeColumn && (
                      <Box sx={{ width: 24, flexShrink: 0 }} />
                    )}
                    {isEditing && canEdit ? (
                      <Input
                        value={editingData?.[column.id as keyof T] ?? cellValue ?? ''}
                        onChange={(e) => updateEditingField(column.id as keyof T, e.target.value)}
                        size='small'
                        fullWidth
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEditing(row);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditing(row);
                          }
                        }}
                      />
                    ) : (
                      column.render
                        ? column.render(row, index)
                        : cellValue !== undefined && cellValue !== null
                          ? String(cellValue)
                          : '-'
                    )}
                  </Box>
                </TableCell>
              );
            })}
            {resolvedRowActions && resolvedRowActions.length > 0 && (
              <TableCell align='right'>
                {isMobile ? (
                  <IconButton
                    size='small'
                    onClick={(e) => handleRowActionClick(e, row)}
                  >
                    <MoreHorizontal style={{ width: 18, height: 18 }} />
                  </IconButton>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                    }}
                  >
                    {resolvedRowActions.slice(0, 3).map((action, actionIndex) => {
                      if (action.show && !action.show(row)) return null;
                      return (
                        <Tooltip
                          key={actionIndex}
                          title={action.label}
                        >
                          <IconButton
                            size='small'
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick?.(row);
                            }}
                            color={action.color}
                          >
                            {action.icon || <MoreHorizontal style={{ width: 16, height: 16 }} />}
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                    {resolvedRowActions.length > 3 && (
                      <IconButton
                        size='small'
                        onClick={(e) => handleRowActionClick(e, row)}
                      >
                        <MoreHorizontal style={{ width: 16, height: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                )}
              </TableCell>
            )}
            {columnConfigurable && <TableCell />}
          </TableRow>
          {expandable && isExpanded && (
            <TableRow>
              <TableCell
                colSpan={
                  visibleColumns.length +
                  (selectable ? 1 : 0) +
                  (showRowNumber ? 1 : 0) +
                  (expandable ? 1 : 0) +
                  (resolvedRowActions ? 1 : 0) +
                  (columnConfigurable ? 1 : 0)
                }
                sx={{ py: 0 }}
              >
                <Collapse
                  in={isExpanded}
                  timeout='auto'
                  unmountOnExit
                >
                  <Box sx={{ py: 2, px: 1 }}>{renderExpandedRow(row, index)}</Box>
                </Collapse>
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      );
    });
  };

  // 渲染汇总行
  const renderSummaryRow = () => {
    if (!resolvedShowSummary) return null;

    const summaryData = resolvedTreeView ? treeTableData : data;

    return (
      <TableRow
        sx={{
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'grey.50',
          fontWeight: 600,
        }}
      >
        {selectable && <TableCell padding='checkbox' sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }} />}
        {isBatchSelectionEnabled && !selectable && <TableCell padding='checkbox' sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'inherit' }} />}
        {showRowNumber && (
          <TableCell sx={{ position: selectable ? 'sticky' : 'relative', left: selectable ? 48 : 0, zIndex: 1, bgcolor: 'inherit' }}>
            合计
          </TableCell>
        )}
        {resolvedTreeView && <TableCell padding='checkbox' sx={{ width: 48 }} />}
        {visibleColumns.map((column) => {
          const isFixed = column.fixed !== undefined;
          const leftPos = fixedColumnPositions.leftPositions[column.id];
          const rightPos = fixedColumnPositions.rightPositions[column.id];
          const colWidth = resolvedColumnResizable
            ? columnWidthResult.getColumnWidth(column.id)
            : column.width;

          let summaryContent: React.ReactNode = '-';

          if (column.summaryType === 'custom' && column.summaryRender) {
            summaryContent = column.summaryRender(summaryData);
          } else if (column.summaryType === 'count') {
            summaryContent = summaryData.length;
          } else if (column.summaryType === 'sum' || column.summaryType === 'avg' || column.summaryType === 'max' || column.summaryType === 'min') {
            const values = summaryData
              .map((row) => Number((row as unknown as Record<string, unknown>)[column.id]))
              .filter((v) => !isNaN(v));
            if (values.length === 0) {
              summaryContent = '-';
            } else if (column.summaryType === 'sum') {
              summaryContent = values.reduce((a, b) => a + b, 0).toLocaleString();
            } else if (column.summaryType === 'avg') {
              summaryContent = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
            } else if (column.summaryType === 'max') {
              summaryContent = Math.max(...values).toLocaleString();
            } else if (column.summaryType === 'min') {
              summaryContent = Math.min(...values).toLocaleString();
            }
          }

          return (
            <TableCell
              key={column.id}
              align={column.align || 'left'}
              width={colWidth}
              sx={{
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                position: isFixed ? 'sticky' : 'static',
                left: column.fixed === 'left' ? leftPos : undefined,
                right: column.fixed === 'right' ? rightPos : undefined,
                zIndex: isFixed ? 1 : 0,
                bgcolor: 'inherit',
              }}
            >
              {summaryContent}
            </TableCell>
          );
        })}
        {resolvedRowActions && resolvedRowActions.length > 0 && (
          <TableCell align='right' sx={{ width: 80 }} />
        )}
        {columnConfigurable && <TableCell sx={{ width: 48 }} />}
      </TableRow>
    );
  };

  // 渲染分页
  const renderPagination = () => {
    if (!resolvedPagination) return null;

    return (
      <TablePagination
        component='div'
        count={resolvedPagination.total}
        page={resolvedPagination.page}
        onPageChange={(_, page) => resolvedPagination.onPageChange(page)}
        rowsPerPage={resolvedPagination.pageSize}
        onRowsPerPageChange={(e) => resolvedPagination.onPageSizeChange?.(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage='每页行数'
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
      />
    );
  };

  // 渲染移动端卡片视图
  const shouldUseMobileCard =
    isMobile && (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));

  const renderMobileCardView = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant='rectangular'
              height={120}
              sx={{ borderRadius: 1 }}
            />
          ))}
        </Box>
      );
    }

    if (!data || data.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {emptyMessage}
          </Typography>
        </Box>
      );
    }

    // 构建字段标签映射（从 columns 配置自动生成）
    const autoFieldLabels: Record<string, string> = {};
    visibleColumns.forEach((col) => {
      autoFieldLabels[col.id] = col.label || col.id;
    });
    const fieldLabels = { ...autoFieldLabels, ...(mobileCardFieldLabels || {}) };

    // 确定展示字段
    const displayFields =
      mobileCardDisplayFields ||
      visibleColumns
        .filter((c) => c.id !== mobileCardTitleKey && c.id !== mobileCardSubtitleKey)
        .slice(0, 4)
        .map((c) => c.id);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 1.5 }}>
        {data.map((row, index) => {
          const rowId = getRowId ? getRowId(row) : ((row as unknown as Record<string, unknown>).id as string | number ?? index);
          const isSelected = selectedIds.has(rowId);

          // 优先使用自定义渲染函数
          if (mobileCardRender) {
            return (
              <Box
                key={rowId}
                onClick={() => resolvedOnRowClick?.(row)}
            sx={{
              cursor: resolvedOnRowClick ? 'pointer' : 'default',
                  '&:active': resolvedOnRowClick ? { opacity: 0.8 } : {},
                }}
              >
                {mobileCardRender(row, index)}
              </Box>
            );
          }

          // 默认卡片渲染
          const rowObj = row as unknown as Record<string, unknown>;
          const title = mobileCardTitleKey
            ? rowObj[mobileCardTitleKey]
            : rowObj.name || rowObj.title || rowObj.code || `项目 ${index + 1}`;
          const subtitle = mobileCardSubtitleKey ? rowObj[mobileCardSubtitleKey] : '';

          return (
            <Box
              key={rowId}
              onClick={() => resolvedOnRowClick?.(row)}
              sx={{
                cursor: resolvedOnRowClick ? 'pointer' : 'default',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 1.5,
                minHeight: 44,
                '&:active': resolvedOnRowClick ? { bgcolor: 'action.hover' } : {},
                transition: 'background-color 150ms',
              }}
            >
              {/* 卡片头部：标题 + 选择框 + 行操作 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: displayFields.length > 0 ? 1 : 0,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {String(title ?? '')}
                  </Typography>
                  {subtitle ? (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{
                        fontSize: 12,
                        mt: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(subtitle)}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {selectable && (
                    <Checkbox
                      size='small'
                      checked={isSelected || false}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectRow(row)}
                      sx={{ p: 0.5 }}
                    />
                  )}
                  {resolvedRowActions && resolvedRowActions.length > 0 && (
                    <IconButton
                      size='small'
                      onClick={(e) => handleRowActionClick(e, row)}
                    >
                      <MoreHorizontal style={{ width: 18, height: 18 }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* 卡片内容：字段列表 */}
              {displayFields.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                  {displayFields.map((field) => {
                    const value = rowObj[field];
                    const label = fieldLabels[field] || field;
                    const displayValue =
                      value == null || value === ''
                        ? '-'
                        : typeof value === 'boolean'
                          ? value
                            ? '是'
                            : '否'
                          : String(value);

                    return (
                      <Box
                        key={field}
                        sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
                      >
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ fontSize: 11, fontWeight: 500 }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayValue}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box {...props}>
      {/* 页面头部：面包屑、标题、操作按钮 */}
      {(breadcrumbs || title) && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {/* 面包屑导航 */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs
              separator={<ChevronRight size={14} />}
              sx={{ mb: 1 }}
            >
              {breadcrumbs.map((crumb, index) =>
                crumb.href ? (
                  <Link
                    key={index}
                    component={RouterLink}
                    to={crumb.href}
                    color='inherit'
                    underline='hover'
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography
                    key={index}
                    color='text.primary'
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {crumb.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>
          )}

          {/* 标题栏 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* 返回按钮 */}
              {backButton && (
                <BackButton
                  onClick={backButton.onClick}
                  href={backButton.href}
                  size='small'
                  sx={{ bgcolor: 'action.hover' }}
                />
              )}

              {/* 标题和副标题 */}
              <Box>
                {title && (
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 600, color: 'text.primary' }}
                  >
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 0.25 }}
                  >
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 操作按钮 */}
            {(primaryActionButton || (actions && actions.length > 0)) && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {primaryActionButton && (
                  <Button
                    variant='contained'
                    startIcon={primaryActionButton.icon}
                    onClick={primaryActionButton.onClick}
                    sx={
                      primaryActionButton.gradient
                        ? {
                            background: primaryActionButton.gradient,
                            color: '#fff',
                            '&:hover': { opacity: 0.9 },
                          }
                        : {}
                    }
                  >
                    {primaryActionButton.label}
                  </Button>
                )}
                {/* 刷新按钮 */}
                {onRefresh && (
                  <Tooltip title='刷新'>
                    <IconButton
                      onClick={onRefresh}
                      size='small'
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {/* 导出按钮 */}
                {resolvedExportable && (
                  <div>
                    <Tooltip
                      title={exporting ? '导出中...' : exportComplete ? '导出成功' : '导出数据'}
                    >
                      <IconButton
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                        size='small'
                        disabled={data.length === 0 || exporting}
                        color={exportComplete ? 'primary' : 'inherit'}
                      >
                        <Download size={18} />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={exportAnchorEl}
                      open={Boolean(exportAnchorEl)}
                      onClose={() => setExportAnchorEl(null)}
                      sx={{ '& .MuiMenu-paper': { minWidth: 200 } }}
                    >
                      {resolvedExportScopes.includes('current') && (
                        <>
                          <MenuItem disabled sx={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>导出当前页</ListItemText>
                          </MenuItem>
                          {resolvedExportFormats.includes('csv') && (
                            <MenuItem onClick={() => handleExport('csv', 'current')}>
                              <ListItemIcon>
                                <FileText style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>CSV 格式</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('json') && (
                            <MenuItem onClick={() => handleExport('json', 'current')}>
                              <ListItemIcon>
                                <FileJson style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>JSON 格式</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('excel') && (
                            <MenuItem onClick={() => handleExport('excel', 'current')}>
                              <ListItemIcon>
                                <FileSpreadsheet style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>Excel 格式</ListItemText>
                            </MenuItem>
                          )}
                        </>
                      )}
                      {(resolvedExportScopes.includes('all') || resolvedExportScopes.includes('selected')) && (
                        <Divider sx={{ my: 0.5 }} />
                      )}
                      {resolvedExportScopes.includes('selected') && (
                        <>
                          <MenuItem disabled sx={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>
                              导出选中项 ({selectedIds.size})
                            </ListItemText>
                          </MenuItem>
                          {resolvedExportFormats.includes('csv') && (
                            <MenuItem
                              onClick={() => handleExport('csv', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileText style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>CSV 格式</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('json') && (
                            <MenuItem
                              onClick={() => handleExport('json', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileJson style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>JSON 格式</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('excel') && (
                            <MenuItem
                              onClick={() => handleExport('excel', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileSpreadsheet style={{ width: 16, height: 16 }} />
                              </ListItemIcon>
                              <ListItemText>Excel 格式</ListItemText>
                            </MenuItem>
                          )}
                        </>
                      )}
                    </Menu>
                  </div>
                )}
                {/* 自定义操作按钮 */}
                {(effectiveActions || []).map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'contained'}
                    size='small'
                    startIcon={action.icon}
                    onClick={action.onClick}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {action.label}
                  </Button>
                ))}
                {/* 批量操作按钮 */}
                {hasBatchActions && selectedIds.size > 0 && (
                  <div>
                    <Button
                      variant='outlined'
                      size='small'
                      color='primary'
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      已选择 {selectedIds.size} 项
                    </Button>
                    {resolvedBatchActions?.map((action, index) => (
                      <Button
                        key={index}
                        variant='contained'
                        size='small'
                        startIcon={action.icon}
                        onClick={() => handleBatchAction(action)}
                        disabled={action.disabled || selectedIds.size === 0}
                        color={action.color || 'primary'}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {action.label}
                      </Button>
                    ))}
                    <Button
                      variant='text'
                      size='small'
                      onClick={() => setSelectedIds(new Set())}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      取消选择
                    </Button>
                  </div>
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* 批量操作栏 */}
      <ListBatchActions
        show={showBatchActionBar && !!selectable}
        selectedCount={effectiveSelectedIds.length}
        selectedRows={getSelectedRows()}
        onClearSelection={() => effectiveOnSelectionChange?.([])}
        batchActions={resolvedBatchActions || []}
        onBatchAction={handleBatchAction}
      />

      {/* 统计卡片 */}
      {resolvedStatsCards && resolvedStatsCards.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: `repeat(${Math.min(resolvedStatsCards.length, 4)}, 1fr)`,
                md: `repeat(${Math.min(resolvedStatsCards.length, 6)}, 1fr)`,
              },
              gap: 2,
            }}
          >
            {resolvedStatsCards.map((card) => (
              <Paper
                key={card.key}
                elevation={0}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 600,
                    color:
                      card.color === 'primary'
                        ? 'primary.main'
                        : card.color === 'success'
                        ? 'success.main'
                        : card.color === 'warning'
                        ? 'warning.main'
                        : card.color === 'error'
                        ? 'error.main'
                        : card.color === 'info'
                        ? 'info.main'
                        : 'text.primary',
                  }}
                >
                  {card.value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* 搜索和筛选 */}
      <ListSearchBar
        searchable={resolvedSearchable}
        searchPlaceholder={resolvedSearchPlaceholder}
        searchInput={searchInput}
        onSearchChange={handleSearch}
        globalSearch={globalSearch}
        filters={resolvedFilters}
        filtersValue={localFilters}
        onFilterChange={handleFilterChange}
        quickFilters={resolvedQuickFilters as any}
        onQuickFilter={effectiveOnQuickFilter}
        activeQuickFilterKey={isQuickFilterUrlSyncEnabled ? activeQuickFilterKey : null}
      />

      {/* 视图切换工具栏（仅当有多种视图模式时显示） */}
      {effectiveViewModes.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ display: 'inline-flex', bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
            {effectiveViewModes.map((mode) => (
              <Tooltip key={mode} title={mode === 'table' ? '表格视图' : '卡片视图'}>
                <IconButton
                  size="small"
                  onClick={() => handleViewModeChange(mode)}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: effectiveViewMode === mode ? 'background.paper' : 'transparent',
                    boxShadow: effectiveViewMode === mode ? 1 : 'none',
                    color: effectiveViewMode === mode ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: effectiveViewMode === mode ? 'background.paper' : 'action.selected',
                    },
                  }}
                >
                  {mode === 'table' ? <Columns3 size={18} /> : <FileText size={18} />}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      {/* 自定义头部内容 */}
      {resolvedHeaderContent}

      {/* 数据展示：移动端使用卡片视图，桌面端根据 viewMode 切换 */}
      {shouldUseMobileCard ? (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {renderMobileCardView()}
          {renderPagination()}
        </Paper>
      ) : effectiveViewMode === 'card' && (renderCardView || renderCardItem || resolvedCardViewConfig) ? (
        // 卡片视图
        <Box>
          {renderCardView ? (
            renderCardView(data)
          ) : resolvedCardViewConfig ? (
            <CardView
              data={data as any[]}
              config={{
                ...(resolvedCardViewConfig as any),
                onClick: crud && hasForm
                  ? (row: any) => openViewForm(row)
                  : (resolvedCardViewConfig as any).onClick,
                actions: crud && hasForm
                  ? [
                      {
                        key: 'edit',
                        label: '编辑',
                        icon: <Edit size={16} />,
                        onClick: (row: any) => openEditForm(row),
                      },
                      {
                        key: 'delete',
                        label: '删除',
                        icon: <Trash2 size={16} />,
                        color: 'error' as const,
                        onClick: (row: any) => handleDelete(row),
                      },
                      ...((resolvedCardViewConfig as any).actions || []),
                    ]
                  : (resolvedCardViewConfig as any).actions,
              }}
              loading={loading}
              getRowId={getRowId as any}
              columns={{
                xs: 1,
                sm: 1,
                md: crud?.cardGridColumns ?? cardGridColumns ?? 2,
                lg: crud?.cardGridColumns ?? cardGridColumns ?? 3,
                xl: crud?.cardGridColumns ?? cardGridColumns ?? 3,
              }}
            />
          ) : renderCardItem ? (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr',
                  md: cardGridColumns ? `repeat(${cardGridColumns}, 1fr)` : 'repeat(2, 1fr)',
                  lg: cardGridColumns ? `repeat(${cardGridColumns}, 1fr)` : 'repeat(3, 1fr)',
                },
              }}
            >
              {data.map((row, index) => (
                <Paper key={getRowId?.(row) ?? index} sx={{ borderRadius: 3, p: 2 }}>
                  {renderCardItem(row, index)}
                </Paper>
              ))}
            </Box>
          ) : null}
          {renderPagination()}
        </Box>
      ) : (
        // 表格视图（默认）
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3 }}
        >
          <Table>
            {renderTableHead()}
            {resolvedShowSummary && resolvedSummaryPosition === 'top' && (
              <TableBody>{renderSummaryRow()}</TableBody>
            )}
            <TableBody>{renderTableBody()}</TableBody>
            {resolvedShowSummary && resolvedSummaryPosition === 'bottom' && (
              <TableBody>{renderSummaryRow()}</TableBody>
            )}
          </Table>
          {renderPagination()}
        </TableContainer>
      )}

      {/* 自定义底部内容 */}
      {footerContent}

      {/* 列配置 */}
      <ListColumnConfig
        open={columnConfigurable ? Boolean(columnConfigAnchor) : false}
        anchorEl={columnConfigAnchor}
        onClose={() => setColumnConfigAnchor(null)}
        columns={columns}
        columnConfig={columnConfig}
        onVisibilityChange={handleColumnVisibilityChange}
        onReset={handleResetColumnConfig}
        onConfigChange={handleColumnConfigChange}
      />

      {/* 行操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleRowActionClose}
      >
        {resolvedRowActions?.map((action, index) => {
          if (action.show && selectedRow && !action.show(selectedRow)) return null;

          return (
            <React.Fragment key={index}>
              {action.divider && <Divider />}
              <MenuItem onClick={() => handleRowAction(action)}>
                {action.icon && (
                  <ListItemIcon sx={{ color: `${action.color}.main` }}>{action.icon}</ListItemIcon>
                )}
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            </React.Fragment>
          );
        })}
      </Menu>

      {/* 批量操作确认对话框 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirm}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>确认{pendingAction?.label}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            <Typography variant='body1'>
              确定要对 <strong>{selectedIds.size}</strong> 条选中的数据执行
              <strong>{pendingAction?.label}</strong> 操作吗？
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          <Button onClick={handleCancelConfirm}>取消</Button>
          <Button
            onClick={handleConfirmBatchAction}
            color='primary'
            variant='contained'
          >
            确认{pendingAction?.label}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量操作进度显示 */}
      <Dialog
        open={batchOperationState.isProcessing}
        sx={{ '& .MuiDialog-paper': { borderRadius: 2, minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {batchOperationState.isCancelled
            ? `${batchOperationState.actionLabel}已取消`
            : `${batchOperationState.actionLabel}中...`}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='body1'>
              {batchOperationState.isCancelled ? (
                <span>操作已取消，正在回滚...</span>
              ) : (
                <span>
                  正在处理{' '}
                  <strong>
                    {batchOperationState.processed}/{batchOperationState.total}
                  </strong>{' '}
                  条数据
                </span>
              )}
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={(batchOperationState.processed / batchOperationState.total) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          {!batchOperationState.isCancelled && (
            <Button
              onClick={handleCancelBatchOperation}
              color='error'
            >
              取消操作
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* CRUD 编辑/新建表单（Dialog 或 Drawer 模式） */}
      {hasForm &&
        (crud!.editMode === 'drawer' ? (
          <FormDrawer
            open={formOpen}
            title={
              formMode === 'create'
                ? `新建${crud!.entityName || ''}`
                : formMode === 'edit'
                  ? `编辑${crud!.entityName || ''}`
                  : `查看${crud!.entityName || ''}`
            }
            onClose={closeForm}
            onSubmit={() => {
              if (crud?.formFields && formMode !== 'view') handleAutoFormSubmit();
            }}
            loading={formSubmitting}
            width={crud!.drawerWidth}
            anchor={crud!.drawerAnchor as any}
          >
            {formContent}
          </FormDrawer>
        ) : (
          <FormDialog
            open={formOpen}
            title={
              formMode === 'create'
                ? `新建${crud!.entityName || ''}`
                : formMode === 'edit'
                  ? `编辑${crud!.entityName || ''}`
                  : `查看${crud!.entityName || ''}`
            }
            onClose={closeForm}
            onSubmit={() => {
              if (crud?.formFields && formMode !== 'view') handleAutoFormSubmit();
            }}
            loading={formSubmitting}
            maxWidth={crud!.dialogMaxWidth as any}
          >
            {formContent}
          </FormDialog>
        ))}
    </Box>
  );
}

// 重新导出类型以保持向后兼容
export type {
  ColumnDef,
  FilterOption,
  RowAction,
  ExpandedRowRenderProps,
  ColumnConfig,
  BatchAction,
  ListPageTemplateProps,
  CardViewConfig,
  CardViewFieldConfig,
  CardViewAction,
  ListPageCrudConfig,
  CrudFormFieldConfig,
} from './list/types';

export type { FilterConfig } from '@topems/shared-components';

const MemoizedListPageTemplate = React.memo(ListPageTemplate) as typeof ListPageTemplate;
export default MemoizedListPageTemplate;
