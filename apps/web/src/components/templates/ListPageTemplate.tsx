import { iconSm, iconLg } from '../sharedStyles';
import { ListPageHeader } from './ListPageHeader';
import { useListPageForm } from './useListPageForm';
import { useListPageSortSearch } from './useListPageSortSearch';
import { useListPageSelection } from './useListPageSelection';
import { useListPageMisc } from './useListPageMisc';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TablePagination,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import i18n from '@/i18n';
import {
  AlertTriangle as WarningIcon,
  MoreHorizontal,
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
import {
  useListPageState,
  useUrlListState,
  useCrudOperations,
  useColumnConfig,
  useColumnWidth,
  useUrlState,
} from '@/hooks';
import type { CrudOperations } from '@/hooks';
import { mapListParamsToBackend } from '@/utils/listParamMapping';
import { FormDialog, FormDrawer } from '@/components/common';
// 从子组件导入类型和组件
import type {
  ListPageTemplateProps,
  ColumnConfig,
  RowAction,
  BatchAction,
  ListViewMode,
  ColumnDef,
} from './list';
import type { FilterConfig } from '@topems/shared-components';
import { loadColumnConfig, saveColumnConfig, type CardViewConfig } from './list/types';
import { useInlineEdit } from './list/useInlineEdit';
import { useTreeTable } from './list/useTreeTable';
import { useListExport } from './list/useListExport';
import { computeFixedColumnPositions } from './list/columnLayout';
import { validateCrudForm } from './list/formValidation';
import { ListSearchBar } from './list/ListSearchBar';
import { ListBatchActions } from './list/ListBatchActions';
import { ListColumnConfig } from './list/ListColumnConfig';
import { CardView } from './list/CardView';
import { CrudAutoForm } from './list/CrudAutoForm';
import { ListTableHead } from './list/ListTableHead';
import { ListTableBody } from './list/ListTableBody';
import { ListMobileCardView } from './list/ListMobileCardView';
import { ListSummaryRow } from './list/ListSummaryRow';
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
export function ListPageTemplate<
  T extends {
    id?: string | number;
  },
>({
  title,
  subtitle,
  breadcrumbs: _manualBreadcrumbs, // G1: 面包屑统一由 AppShell 自动面包屑渲染
  autoBreadcrumbs: _autoBreadcrumbs,
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
  searchPlaceholder = i18n.t('components.list_page_template.k0'),
  searchValue,
  onSearch,
  onSearchChange,
  globalSearch,
  filters,
  filtersValue,
  onFilterChange,
  actions,
  rowActions,
  renderRowActions,
  onRefresh,
  showBatchActionBar = true,
  emptyMessage = i18n.t('templates.list_page_template.k0'),
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
  // 选择 - selectedIds 单独解构避免进入 ...props 传递给 DOM
  selectedIds: selectedIdsProp,
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
  // 注意：crudResult 已使用泛型 T 绑定，类型安全
  const dummyApi: CrudOperations<Record<string, unknown>> = {
    list: () =>
      Promise.resolve({ success: true, code: 0, message: '', data: { items: [], total: 0 } }),
    get: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    create: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    update: () => Promise.resolve({ success: true, code: 0, message: '', data: undefined }),
    delete: () => Promise.resolve({ success: true, code: 0, message: '', data: '' }),
  };
  const crudApi = (crud?.api ?? dummyApi) as CrudOperations<T>;
  const crudQueryKey: string = crud?.queryKey ?? `__dummy_${Math.random().toString(36).slice(2)}`;
  const crudResult = useCrudOperations({
    api: crudApi,
    queryKey: crudQueryKey,
    autoFetch: crud ? (crud.autoFetch ?? true) : false,
    defaultPageSize: crud?.defaultPageSize ?? 10,
    pageParamName: crud?.pageParamName ?? 'page',
    pageSizeParamName: crud?.pageSizeParamName ?? 'page_size',
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
  const urlListStateResult = useUrlListState(
    effectiveListState?.urlSync
      ? {
          defaultSearch: effectiveListState.defaultSearch,
          baseIndex: effectiveListState.baseIndex,
          defaultPage: effectiveListState.defaultPage,
          defaultPageSize: effectiveListState.defaultPageSize,
          debounceMs: effectiveListState.debounceMs,
          prefix: effectiveListState.urlPrefix,
        }
      : { prefix: '__unused__', defaultPageSize: 10 }
  );
  const listPageStateResult = useListPageState(effectiveListState ?? undefined);
  const internalListStateResult = effectiveListState
    ? effectiveListState.urlSync
      ? urlListStateResult
      : listPageStateResult
    : null;
  // 解析最终数据/加载状态/错误：外部传入优先，其次 crud 内部
  // V64 防御：过滤掉 data 中可能存在的 null / undefined 元素，避免 300+ 处
  // schema renderCell 因 "row is undefined" 抛错（典型：can't access property "isactive"）
  const rawData = useMemo(
    () => propData ?? (crud ? crudResult.data : []),
    [propData, crud, crudResult]
  );
  const data = useMemo(
    () =>
      Array.isArray(rawData) ? rawData.filter((r): r is NonNullable<typeof r> => r != null) : [],
    [rawData]
  );
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
        const col: ColumnDef<T> = {
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
          col.render = (row: T, index: number) => {
            const safeRow = row ?? ({} as T);
            const rowRecord = safeRow as Record<string, unknown>;
            return field.tableRender!(rowRecord[field.key], safeRow, index);
          };
          return col;
        }
        // 状态 Chip 渲染（tableStatus 显式标记，或 select 类型且有状态映射）
        if (
          field.tableStatus ||
          (field.type === 'select' && (field.tableStatusColorMap || field.tableStatusLabelMap))
        ) {
          const colorMap = field.tableStatusColorMap || {};
          const labelMap = field.tableStatusLabelMap || {};
          col.render = (row: T) => {
            const safeRow = row ?? ({} as T);
            const value = String((safeRow as Record<string, unknown>)[field.key] ?? '');
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
        // 布尔值 / switch 类型渲染
        if (field.type === 'switch') {
          col.render = (row: T) => {
            const safeRow = row ?? ({} as T);
            const value = (safeRow as Record<string, unknown>)[field.key];
            return (
              <Chip
                label={
                  value
                    ? i18n.t('templates.list_page_template.k2')
                    : i18n.t('templates.list_page_template.k1')
                }
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
          col.render = (row: T) => {
            const safeRow = row ?? ({} as T);
            const value = (safeRow as Record<string, unknown>)[field.key];
            return value ? String(value) : '-';
          };
          return col;
        }
        return col;
      }) as ColumnDef<T>[];
  }, [columns, crud?.formFields]);
  // 列宽调整
  const columnWidthResult = useColumnWidth({
    storageKey:
      (columnResizable || crud?.columnResizable) && persistColumnWidth
        ? columnWidthStorageKey
        : undefined,
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
    if (!crud?.formFields || !crud.cardView) return;
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
  const { toggleExpand, treeTableData, getRowLevel, hasChildren, treeColumnId } = useTreeTable<T>({
    treeView: resolvedTreeView,
    data,
    treeChildrenField,
    treeNodeKeyField,
    defaultExpandedKeys,
    expandedKeysProp,
    onExpandedKeysChange,
    resolvedColumns,
  });
  // ==================== 行内编辑 ====================
  const {
    editingData,
    resolvedEditingRowId,
    startEditing,
    cancelEditing,
    saveEditing,
    updateEditingField,
  } = useInlineEdit<T>({
    editingRowIdProp,
    onEditingRowIdChange,
    onInlineEditSave,
    onInlineEditCancel,
    getRowId,
  });
  // crud 模式下自动推断搜索配置
  const resolvedSearchable = useMemo(() => {
    if (searchable !== undefined) return searchable;
    if (crud) {
      return crud.searchable !== false;
    }
    return !!onSearch || !!onSearchChange || !!searchValue;
  }, [searchable, crud, onSearch, onSearchChange, searchValue]);
  const resolvedSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder !== i18n.t('components.list_page_template.k1')) return searchPlaceholder;
    if (crud?.searchPlaceholder) return crud.searchPlaceholder;
    if (title) return `${i18n.t('components.list_page_template.k2')}${title}...`;
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
      label: i18n.t('templates.list_page_template.k3'),
      value: crudResult.pagination.total ?? 0,
      color: 'primary',
    });
    // 状态统计卡片
    const statusField =
      crud.statsStatusField ||
      crud.formFields.find((f) => f.tableStatus || f.key === 'status' || f.key === 'state');
    if (statusField) {
      const fieldKey =
        crud.statsStatusField || (typeof statusField !== 'string' ? statusField.key : statusField);
      const fieldConfig = crud.formFields.find((f) => f.key === fieldKey);
      const colorMap = fieldConfig?.tableStatusColorMap || {};
      const labelMap = fieldConfig?.tableStatusLabelMap || {};
      const options = fieldConfig?.options || [];
      options.forEach((opt) => {
        const count =
          crudResult.data?.filter(
            (item: T) => (item as Record<string, unknown>)[fieldKey] === opt.value
          ).length || 0;
        type CardColor = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
        const color = (colorMap[opt.value as string] || 'default') as CardColor;
        cards.push({
          key: `status_${opt.value}`,
          label: labelMap[opt.value as string] || String(opt.label),
          value: count,
          color,
        });
      });
    }
    return cards;
  }, [crud, crudResult.pagination.total, crudResult.data]);
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
      filters: Record<string, unknown>;
    }> = [];
    // 全部选项
    if (crud.quickFilterShowAll !== false) {
      filters.push({
        key: 'all',
        label: i18n.t('templates.list_page_template.k4'),
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
  const buildCrudFetchParams = useCallback((): Record<string, unknown> => {
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
    // 默认：standard 风格
    return mapListParamsToBackend(stateParams, {
      style: 'standard',
    });
  }, [crud, internalListStateResult]);
  // 当启用 crud 时，用内部状态驱动列表查询
  const lastFetchParamsRef = useRef<string>('');
  useEffect(() => {
    if (!crud || !internalListStateResult) return;
    const fetchParams = buildCrudFetchParams();
    // 序列化为字符串做比较，避免对象引用变化导致无限循环
    const paramsKey = JSON.stringify(fetchParams);
    if (paramsKey === lastFetchParamsRef.current) return;
    lastFetchParamsRef.current = paramsKey;
    crudResult.fetch(fetchParams);
  }, [
    crud,
    crudResult.fetch,
    internalListStateResult?.debouncedSearch,
    internalListStateResult?.sortBy,
    internalListStateResult?.sortOrder,
    internalListStateResult?.filters,
    buildCrudFetchParams,
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
  const {
    formOpen,
    formMode,
    currentRecord,
    formSubmitting,
    formData,
    formErrors,
    setFormOpen,
    setFormSubmitting,
    setFormData,
    setFormErrors,
    openCreateForm,
    openEditForm,
    openViewForm,
    closeForm,
  } = useListPageForm<T>({
    formFields: crud?.formFields,
  });
  const handleDelete = useCallback(
    async (record: T): Promise<boolean> => {
      if (!crud) return false;
      const rowId = getRowId ? getRowId(record) : (record as Record<string, unknown>).id;
      if (!rowId) return false;
      if (!confirm(i18n.t('components.list_page_template.k0'))) return false;
      try {
        await crudResult.delete(String(rowId));
        return true;
      } catch {
        return false;
      }
    },
    [crud, crudResult, getRowId]
  );
  const handleFormSubmit = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      if (!crud) return false;
      setFormSubmitting(true);
      try {
        if (formMode === 'create') {
          await crudResult.mutations.createMutation.mutateAsync(data as Partial<T>);
        } else if (formMode === 'edit' && currentRecord?.id) {
          await crudResult.mutations.updateMutation.mutateAsync({
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
    [crud, formMode, currentRecord, crudResult]
  );
  // 表单验证
  const validateForm = useCallback((): boolean => {
    if (!crud?.formFields) return true;
    const errors = validateCrudForm(crud.formFields, formData, formMode);
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
  const renderAutoForm = useCallback(
    (): React.ReactNode =>
      crud?.formFields ? (
        <CrudAutoForm<T>
          crud={crud}
          formMode={formMode}
          formData={formData}
          formErrors={formErrors}
          setFormData={setFormData}
          onSubmit={handleAutoFormSubmit}
        />
      ) : null,
    [crud, formMode, formData, handleAutoFormSubmit, formErrors, setFormData]
  );
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
    return;
  }, [onRowClick, crud, hasForm, openViewForm]);
  // crud 模式下自动推断双击行编辑行为
  const resolvedOnRowDoubleClick = useMemo(() => {
    if (crud && hasForm && crud.doubleClickToEdit !== false) {
      return (row: T) => openEditForm(row);
    }
    return;
  }, [crud, hasForm, openEditForm]);
  // crud 模式下，若提供了表单配置且未传自定义 actions，则自动添加新建按钮
  const effectiveActions = useMemo(() => {
    if (!hasForm || !crud || crud.showCreateButton === false) return actions;
    const createAction = {
      label: crud.createButtonText || i18n.t('templates.list_page_template.k13'),
      icon: <Plus size={18} />,
      variant: 'contained' as const,
      onClick: openCreateForm,
      testId: 'crud-create-btn',
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
  const { sortBy, sortOrder, setSortBy, setSortOrder, searchInput, setLocalSearchInput } =
    useListPageSortSearch({
      defaultSortBy,
      defaultSortOrder,
      searchValue,
      persistSearch,
      filterStorageKey,
      internalSearchQuery: internalListStateResult?.searchQuery,
    });
  const {
    anchorEl,
    selectedRow,
    setAnchorEl,
    setSelectedRow,
    selectedIds,
    setSelectedIds,
    batchOperationState,
    setBatchOperationState,
    batchAbortController,
  } = useListPageSelection<T>({
    filterStorageKey,
    persistSelection: persistColumnConfig, // 复用 persistColumnConfig 作为选中持久化开关
  });
  const {
    confirmDialogOpen,
    setConfirmDialogOpen,
    pendingAction,
    setPendingAction,
    expandedIds,
    setExpandedIds,
    columnConfig,
    setColumnConfig,
    exporting,
    setExporting,
    exportComplete,
    setExportComplete,
    exportAnchorEl,
    setExportAnchorEl,
    mobileMenuEl,
    setMobileMenuEl,
  } = useListPageMisc<T>({
    defaultExpandedIds,
    columnConfigStorageKey,
    columnConfigurable,
    resolvedColumns,
    defaultColumnConfig,
    persistColumnConfig,
    loadColumnConfig,
  });
  // 列配置 Popover 状态
  const [columnConfigAnchor, setColumnConfigAnchor] = useState<HTMLElement | null>(null);
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
  }, [columnConfigResult.visibleColumnIds, columnConfig, urlColSyncEnabled]);
  // 内部 columnConfig 变化时同步回 useColumnConfig（写 URL 和 localStorage）
  useEffect(() => {
    if (!urlColSyncEnabled) return;
    const ids = visibleIdsFromConfig(columnConfig);
    if (ids.join(',') !== columnConfigResult.visibleColumnIds.join(',')) {
      columnConfigResult.reorderColumns(ids);
    }
  }, [columnConfig, columnConfigResult, urlColSyncEnabled]);
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
        label: i18n.t('templates.list_page_template.k14'),
        icon: null,
        color: 'error',
        onClick: (selectedRows: T[]) => {
          const ids = selectedRows.map((row: T) => row.id).filter(Boolean);
          if (ids.length === 0) return;
          if (
            confirm(
              `${i18n.t('components.list_page_template.k12')}${ids.length}${i18n.t('components.list_page_template.k13')}`
            )
          ) {
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
      label: i18n.t('templates.list_page_template.k15'),
      icon: <Edit size={16} />,
      onClick: (row: T) => openEditForm(row),
    });
    builtInActions.push({
      key: 'delete',
      label: i18n.t('templates.list_page_template.k16'),
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
  const handleFilterChange = useCallback(
    (newFilters: Record<string, unknown>) => {
      setLocalFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [setLocalFilters, onFilterChange]
  );
  const handleQuickFilter = useCallback(
    (quickFilter: { filters: Record<string, unknown>; searchValue?: string }) => {
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
  const [activeQuickFilterKey, setActiveQuickFilterKey] = useUrlState<string | null>(
    qfUrlKey,
    null,
    {
      mode: isQuickFilterUrlSyncEnabled
        ? (effectiveListState!.urlSync as 'replace' | 'push')
        : 'replace',
      removeDefault: true,
    }
  );
  // 点击快速筛选时更新 URL 和激活态
  const effectiveOnQuickFilter = useCallback(
    (quickFilter: { key?: string; filters: Record<string, unknown>; searchValue?: string }) => {
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
    const matched = quickFilters.find(
      (qf, idx) => (qf.key ?? String(idx)) === activeQuickFilterKey
    );
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
  const [viewModeUrlState, setViewModeUrlState] = useUrlState<ListViewMode>(
    viewModeUrlKey,
    defaultViewMode,
    {
      mode: isViewModeUrlSyncEnabled
        ? (effectiveListState!.urlSync as 'replace' | 'push')
        : 'replace',
      removeDefault: true,
    }
  );
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
  const effectiveSelectedIds = selection?.selected ?? selectedIdsProp ?? Array.from(selectedIds);
  const effectiveOnSelectionChange = selection?.onChange ?? onSelectionChange;
  // crud 模式下选中变化时触发 onSelectionChange 回调
  useEffect(() => {
    if (!crud?.onSelectionChange) return;
    const selectedRows = data.filter((row) =>
      effectiveSelectedIds.includes(
        getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number)
      )
    );
    crud.onSelectionChange(effectiveSelectedIds, selectedRows);
  }, [effectiveSelectedIds, crud, getRowId, data]);
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
        const allIds = data.map(
          (row) =>
            getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number)
        );
        effectiveOnSelectionChange?.(allIds);
      } else {
        effectiveOnSelectionChange?.([]);
      }
    },
    [data, getRowId, effectiveOnSelectionChange]
  );
  const handleSelectRow = useCallback(
    (row: T) => {
      const rowId =
        getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number);
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
      const rowId =
        getRowId?.(row) ?? ((row as unknown as Record<string, unknown>).id as string | number);
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
  // 导出功能
  const { resolvedExportable, resolvedExportFormats, resolvedExportScopes, handleExport } =
    useListExport<T>({
      exportable,
      exportFileName,
      exportFormats,
      exportScopes,
      exportTransform,
      exportColumns,
      exportIncludeHeader,
      crud,
      title,
      data,
      visibleColumns,
      effectiveSelectedIds,
      getRowId,
      exporting,
      setExporting,
      setExportAnchorEl,
      setExportComplete,
    });
  // 计算固定列的 left/right 位置
  const fixedColumnPositions = useMemo(
    () =>
      computeFixedColumnPositions({
        visibleColumns,
        selectable,
        isBatchSelectionEnabled,
        showRowNumber,
        treeView: resolvedTreeView,
        hasRowActions: !!resolvedRowActions && resolvedRowActions.length > 0,
        columnConfigurable,
        getColumnWidth: (id) => columnWidthResult.getColumnWidth(id),
      }),
    [
      visibleColumns,
      selectable,
      isBatchSelectionEnabled,
      showRowNumber,
      resolvedTreeView,
      resolvedRowActions,
      columnConfigurable,
      columnWidthResult,
    ]
  );
  // 渲染表格头部
  const renderTableHead = () => (
    <ListTableHead<T>
      theme={theme}
      data={data}
      visibleColumns={visibleColumns}
      selectable={selectable}
      isBatchSelectionEnabled={isBatchSelectionEnabled}
      showRowNumber={showRowNumber}
      expandable={expandable}
      effectiveSelectedIds={effectiveSelectedIds}
      selectedIds={selectedIds}
      handleSelectAll={handleSelectAll}
      handleBatchSelectAll={handleBatchSelectAll}
      sortable={sortable}
      sortBy={sortBy}
      sortOrder={sortOrder}
      handleSort={handleSort}
      resolvedColumnResizable={resolvedColumnResizable}
      columnWidthResult={columnWidthResult}
      fixedColumnPositions={fixedColumnPositions}
      renderRowActions={renderRowActions}
      resolvedRowActions={resolvedRowActions}
      columnConfigurable={columnConfigurable}
      setColumnConfigAnchor={setColumnConfigAnchor}
    />
  );
  // 渲染展开行内容
  const renderExpandedRow = (row: T, index: number) => {
    if (typeof expandable === 'function') {
      return expandable(row, index);
    }
    return null;
  };
  // 渲染表格内容
  const renderTableBody = () => (
    <ListTableBody<T>
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      data={data}
      treeTableData={treeTableData}
      emptyMessage={emptyMessage}
      emptyIcon={emptyIcon}
      emptyActionButton={emptyActionButton}
      visibleColumns={visibleColumns}
      selectable={selectable}
      isBatchSelectionEnabled={isBatchSelectionEnabled}
      showRowNumber={showRowNumber}
      expandable={expandable}
      resolvedTreeView={resolvedTreeView}
      treeColumnId={treeColumnId}
      getRowId={getRowId}
      effectiveSelectedIds={effectiveSelectedIds}
      selectedIds={selectedIds}
      expandedIds={expandedIds}
      getRowLevel={getRowLevel}
      hasChildren={hasChildren}
      toggleExpand={toggleExpand}
      handleSelectRow={handleSelectRow}
      handleBatchSelect={handleBatchSelect}
      handleExpandRow={handleExpandRow}
      resolvedRowActions={resolvedRowActions}
      renderRowActions={renderRowActions}
      columnConfigurable={columnConfigurable}
      resolvedOnRowClick={resolvedOnRowClick}
      resolvedOnRowDoubleClick={resolvedOnRowDoubleClick}
      striped={striped}
      theme={theme}
      resolvedColumnResizable={resolvedColumnResizable}
      columnWidthResult={columnWidthResult}
      fixedColumnPositions={fixedColumnPositions}
      resolvedInlineEditable={resolvedInlineEditable}
      resolvedInlineEditMode={resolvedInlineEditMode}
      inlineEdit={{
        editingData,
        resolvedEditingRowId,
        startEditing,
        cancelEditing,
        saveEditing,
        updateEditingField,
      }}
      resolvedPagination={resolvedPagination}
      effectiveListState={effectiveListState}
      renderExpandedRow={renderExpandedRow}
      treeIndentSize={treeIndentSize}
      isMobile={isMobile}
      handleRowActionClick={handleRowActionClick}
    />
  );
  // 渲染汇总行
  const renderSummaryRow = () => (
    <ListSummaryRow<T>
      theme={theme}
      showSummary={resolvedShowSummary}
      treeView={resolvedTreeView}
      treeTableData={treeTableData}
      data={data}
      visibleColumns={visibleColumns}
      fixedColumnPositions={fixedColumnPositions}
      resolvedColumnResizable={resolvedColumnResizable}
      columnWidthResult={columnWidthResult}
      selectable={selectable}
      isBatchSelectionEnabled={isBatchSelectionEnabled}
      showRowNumber={showRowNumber}
      renderRowActions={renderRowActions}
      resolvedRowActions={resolvedRowActions}
      columnConfigurable={columnConfigurable}
    />
  );
  // 渲染分页
  const renderPagination = () => {
    if (!resolvedPagination) return null;
    return (
      <TablePagination
        component='div'
        count={resolvedPagination.total}
        page={resolvedPagination.page - ((effectiveListState?.baseIndex ?? 1) === 1 ? 1 : 0)}
        onPageChange={(_, page) => resolvedPagination.onPageChange(page)}
        rowsPerPage={resolvedPagination.pageSize}
        onRowsPerPageChange={(e) => resolvedPagination.onPageSizeChange?.(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage={i18n.t('templates.list_page_template.k26')}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} ${i18n.t('components.list_page_template.k15')} ${count} ${i18n.t('components.list_page_template.k16')}`
        }
      />
    );
  };
  // 渲染移动端卡片视图
  const shouldUseMobileCard =
    isMobile && (Boolean(mobileCardRender) || Boolean(mobileCardTitleKey));
  const renderMobileCardView = () => (
    <ListMobileCardView<T>
      loading={loading}
      data={data}
      emptyMessage={emptyMessage}
      visibleColumns={visibleColumns}
      mobileCardRender={mobileCardRender}
      mobileCardTitleKey={mobileCardTitleKey}
      mobileCardSubtitleKey={mobileCardSubtitleKey}
      mobileCardFieldLabels={mobileCardFieldLabels}
      mobileCardDisplayFields={mobileCardDisplayFields}
      selectedIds={selectedIds}
      getRowId={getRowId}
      resolvedOnRowClick={resolvedOnRowClick}
      selectable={selectable}
      handleSelectRow={handleSelectRow}
      renderRowActions={renderRowActions}
      resolvedRowActions={resolvedRowActions}
      handleRowActionClick={handleRowActionClick}
    />
  );
  return (
    <Box {...props}>
      {/* 页面头部：标题、操作按钮（G1: 面包屑统一由 AppShell 自动面包屑渲染） */}
      {(title ||
        primaryActionButton ||
        (actions && actions.length > 0) ||
        (effectiveActions && effectiveActions.length > 0)) && (
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
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
            <ListPageHeader
              backButton={backButton}
              title={title}
              subtitle={subtitle}
            />

            {/* 操作按钮 */}
            {(primaryActionButton ||
              (actions && actions.length > 0) ||
              (effectiveActions && effectiveActions.length > 0)) && (
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
                            color: theme.palette.common.white,
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
                  <Tooltip title={i18n.t('templates.list_page_template.k30')}>
                    <IconButton
                      onClick={onRefresh}
                      size='small'
                      aria-label={i18n.t('templates.list_page_template.k31')}
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                  </Tooltip>
                )}
                {/* 导出按钮 */}
                {resolvedExportable && (
                  <div>
                    <Tooltip
                      title={
                        exporting
                          ? i18n.t('components.list_page_template.k18')
                          : exportComplete
                            ? i18n.t('templates.list_page_template.k33')
                            : i18n.t('templates.list_page_template.k32')
                      }
                    >
                      <IconButton
                        onClick={(e) => setExportAnchorEl(e.currentTarget)}
                        size='small'
                        disabled={data.length === 0 || exporting}
                        color={exportComplete ? 'primary' : 'inherit'}
                        aria-label={i18n.t('templates.list_page_template.k34')}
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
                          <MenuItem
                            disabled
                            sx={{ pointerEvents: 'none', opacity: 0.6 }}
                          >
                            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>
                              {i18n.t('components.list_page_template.k3')}
                            </ListItemText>
                          </MenuItem>
                          {resolvedExportFormats.includes('csv') && (
                            <MenuItem onClick={() => handleExport('csv', 'current')}>
                              <ListItemIcon>
                                <FileText style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k0')}</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('json') && (
                            <MenuItem onClick={() => handleExport('json', 'current')}>
                              <ListItemIcon>
                                <FileJson style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k1')}</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('excel') && (
                            <MenuItem onClick={() => handleExport('excel', 'current')}>
                              <ListItemIcon>
                                <FileSpreadsheet style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k2')}</ListItemText>
                            </MenuItem>
                          )}
                        </>
                      )}
                      {(resolvedExportScopes.includes('all') ||
                        resolvedExportScopes.includes('selected')) && <Divider sx={{ my: 0.5 }} />}
                      {resolvedExportScopes.includes('selected') && (
                        <>
                          <MenuItem
                            disabled
                            sx={{ pointerEvents: 'none', opacity: 0.6 }}
                          >
                            <ListItemText sx={{ fontWeight: 600, fontSize: 12 }}>
                              {i18n.t('templates.listPage.k3')}
                              {selectedIds.size})
                            </ListItemText>
                          </MenuItem>
                          {resolvedExportFormats.includes('csv') && (
                            <MenuItem
                              onClick={() => handleExport('csv', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileText style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k0')}</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('json') && (
                            <MenuItem
                              onClick={() => handleExport('json', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileJson style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k1')}</ListItemText>
                            </MenuItem>
                          )}
                          {resolvedExportFormats.includes('excel') && (
                            <MenuItem
                              onClick={() => handleExport('excel', 'selected')}
                              disabled={selectedIds.size === 0}
                            >
                              <ListItemIcon>
                                <FileSpreadsheet style={iconSm} />
                              </ListItemIcon>
                              <ListItemText>{i18n.t('templates.listPage.k2')}</ListItemText>
                            </MenuItem>
                          )}
                        </>
                      )}
                    </Menu>
                  </div>
                )}
                {/* 自定义操作按钮（移动端溢出处理） */}
                {(() => {
                  const actions = effectiveActions || [];
                  const visibleActions = isMobile ? actions.slice(0, 2) : actions;
                  const hiddenActions = isMobile ? actions.slice(2) : [];
                  return (
                    <>
                      {visibleActions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.variant || 'contained'}
                          size='small'
                          data-testid={action.testId}
                          startIcon={!isMobile ? action.icon : undefined}
                          onClick={action.onClick}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {!isMobile
                            ? action.label
                            : action.label && action.label.length > 4
                              ? action.label.slice(0, 4)
                              : action.label}
                        </Button>
                      ))}
                      {hiddenActions.length > 0 && (
                        <>
                          <Tooltip title={i18n.t('templates.list_page_template.k35')}>
                            <IconButton
                              size='small'
                              aria-label={i18n.t('templates.list_page_template.k36')}
                              onClick={(e) => setMobileMenuEl(e.currentTarget)}
                            >
                              <MoreHorizontal style={iconLg} />
                            </IconButton>
                          </Tooltip>
                          <Menu
                            anchorEl={mobileMenuEl}
                            open={Boolean(mobileMenuEl)}
                            onClose={() => setMobileMenuEl(null)}
                            sx={{ '& .MuiMenu-paper': { minWidth: 180 } }}
                          >
                            {hiddenActions.map((action, idx) => (
                              <MenuItem
                                key={idx}
                                onClick={() => {
                                  setMobileMenuEl(null);
                                  action.onClick?.();
                                }}
                              >
                                {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
                                <ListItemText>{action.label}</ListItemText>
                              </MenuItem>
                            ))}
                          </Menu>
                        </>
                      )}
                    </>
                  );
                })()}
                {/* 批量操作按钮 */}
                {hasBatchActions && selectedIds.size > 0 && (
                  <div>
                    <Button
                      variant='outlined'
                      size='small'
                      color='primary'
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {i18n.t('templates.listPage.k4')} {selectedIds.size}{' '}
                      {i18n.t('templates.listPage.selected_items')}
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
                      {i18n.t('components.list_page_template.k4')}
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
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
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
        quickFilters={
          resolvedQuickFilters as unknown as Array<{
            key?: string;
            label: string;
            filters: Record<string, unknown>;
            searchValue?: string;
          }>
        }
        onQuickFilter={effectiveOnQuickFilter}
        activeQuickFilterKey={isQuickFilterUrlSyncEnabled ? activeQuickFilterKey : null}
      />

      {/* 视图切换工具栏（仅当有多种视图模式时显示） */}
      {effectiveViewModes.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Box sx={{ display: 'inline-flex', bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
            {effectiveViewModes.map((mode) => (
              <Tooltip
                key={mode}
                title={
                  mode === 'table'
                    ? i18n.t('templates.list_page_template.k38')
                    : i18n.t('templates.list_page_template.k37')
                }
              >
                <IconButton
                  size='small'
                  onClick={() => handleViewModeChange(mode)}
                  aria-label={
                    mode === 'table'
                      ? i18n.t('templates.list_page_template.k40')
                      : i18n.t('templates.list_page_template.k39')
                  }
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
      ) : effectiveViewMode === 'card' &&
        (renderCardView || renderCardItem || resolvedCardViewConfig) ? (
        // 卡片视图
        <Box>
          {renderCardView ? (
            renderCardView(data)
          ) : resolvedCardViewConfig ? (
            <CardView
              data={data as T[]}
              config={
                {
                  ...resolvedCardViewConfig,
                  onClick:
                    crud && hasForm
                      ? (row: T) => openViewForm(row)
                      : (resolvedCardViewConfig as CardViewConfig<T>).onClick,
                  actions:
                    crud && hasForm
                      ? [
                          {
                            key: 'edit',
                            label: i18n.t('templates.list_page_template.k41'),
                            icon: <Edit size={16} />,
                            onClick: (row: T) => openEditForm(row),
                          },
                          {
                            key: 'delete',
                            label: i18n.t('templates.list_page_template.k42'),
                            icon: <Trash2 size={16} />,
                            color: 'error' as const,
                            onClick: (row: T) => handleDelete(row),
                          },
                          ...((resolvedCardViewConfig as CardViewConfig<T>).actions || []),
                        ]
                      : (resolvedCardViewConfig as CardViewConfig<T>).actions,
                } as unknown as CardViewConfig<unknown>
              }
              loading={loading}
              getRowId={getRowId as (row: unknown) => string | number}
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
                <Paper
                  key={getRowId?.(row) ?? index}
                  sx={{ borderRadius: 3, p: 2 }}
                >
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
        columns={columns as ColumnDef<Record<string, unknown>>[]}
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
        <DialogTitle sx={{ fontWeight: 600 }}>
          {i18n.t('templates.listPage.k5')}
          {pendingAction?.label}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 28 }} />
            <Typography variant='body1'>
              {i18n.t('templates.listPage.k6')} <strong>{selectedIds.size}</strong>{' '}
              {i18n.t('templates.listPage.k7')}
              <strong>{pendingAction?.label}</strong> {i18n.t('templates.listPage.k8')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          <Button onClick={handleCancelConfirm}>
            {i18n.t('templates.list_page_template.k43')}
          </Button>
          <Button
            onClick={handleConfirmBatchAction}
            color='primary'
            variant='contained'
          >
            {i18n.t('templates.listPage.k5')}
            {pendingAction?.label}
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
            ? `${batchOperationState.actionLabel}${i18n.t('components.list_page_template.k19')}`
            : `${batchOperationState.actionLabel}${i18n.t('components.list_page_template.k20')}`}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant='body1'>
              {batchOperationState.isCancelled ? (
                <span>{i18n.t('components.list_page_template.k21')}</span>
              ) : (
                <span>
                  {i18n.t('templates.listPage.k9')}{' '}
                  <strong>
                    {batchOperationState.processed}/{batchOperationState.total}
                  </strong>{' '}
                  {i18n.t('components.list_page_template.k5')}
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
              {i18n.t('components.list_page_template.k6')}
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
                ? `${i18n.t('components.list_page_template.k22')}${crud!.entityName || ''}`
                : formMode === 'edit'
                  ? `${i18n.t('components.list_page_template.k23')}${crud!.entityName || ''}`
                  : `${i18n.t('components.list_page_template.k24')}${crud!.entityName || ''}`
            }
            onClose={closeForm}
            onSubmit={() => {
              if (crud?.formFields && formMode !== 'view') handleAutoFormSubmit();
            }}
            loading={formSubmitting}
            width={crud!.drawerWidth}
            anchor={crud!.drawerAnchor as 'left' | 'right' | 'top' | 'bottom'}
          >
            {formContent}
          </FormDrawer>
        ) : (
          <FormDialog
            open={formOpen}
            title={
              formMode === 'create'
                ? `${i18n.t('components.list_page_template.k25')}${crud!.entityName || ''}`
                : formMode === 'edit'
                  ? `${i18n.t('components.list_page_template.k26')}${crud!.entityName || ''}`
                  : `${i18n.t('components.list_page_template.k27')}${crud!.entityName || ''}`
            }
            onClose={closeForm}
            onSubmit={() => {
              if (crud?.formFields && formMode !== 'view') handleAutoFormSubmit();
            }}
            loading={formSubmitting}
            maxWidth={crud!.dialogMaxWidth as 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false}
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
