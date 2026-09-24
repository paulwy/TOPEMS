import type React from 'react';
import type { BoxProps } from '@mui/material';

import type { FilterConfig } from '@topems/shared-components';

// ============ 类型定义 ============

/** 列表视图模式 */
export type ListViewMode = 'table' | 'card';

/** 卡片视图字段配置 */
export interface CardViewFieldConfig {
  /** 字段名（数据对象中的 key） */
  key: string;
  /** 显示标签 */
  label?: string;
  /** 是否显示标签，默认 true */
  showLabel?: boolean;
  /** 自定义渲染 */
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  /** 宽度占比，默认 1 */
  flex?: number;
}

/** 卡片视图配置 */
export interface CardViewConfig<T = Record<string, unknown>> {
  /** 标题字段名或渲染函数 */
  title?: string | ((row: T) => React.ReactNode);
  /** 副标题字段名或渲染函数 */
  subtitle?: string | ((row: T) => React.ReactNode);
  /** 状态/标签字段名，显示为 Chip */
  statusField?: string;
  /** 状态映射（值 -> 颜色） */
  statusColorMap?: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'>;
  /** 状态标签映射（值 -> 显示文本） */
  statusLabelMap?: Record<string, string>;
  /** 显示的字段列表 */
  fields?: CardViewFieldConfig[];
  /** 每行显示的字段数，默认 2 */
  fieldsPerRow?: number;
  /** 点击卡片回调 */
  onClick?: (row: T) => void;
  /** 卡片操作按钮列表（显示在卡片底部） */
  actions?: CardViewAction<T>[];
  /** 自定义操作区渲染（优先级高于 actions） */
  renderActions?: (row: T) => React.ReactNode;
  /** 是否显示操作分隔线，默认 true */
  showActionsDivider?: boolean;
}

/** 卡片视图操作按钮配置 */
export interface CardViewAction<T = Record<string, unknown>> {
  /** 操作标识 */
  key: string;
  /** 按钮文本 */
  label: string;
  /** 点击回调 */
  onClick: (row: T) => void;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  /** 按钮变体 */
  variant?: 'text' | 'outlined' | 'contained';
  /** 按钮大小 */
  size?: 'small' | 'medium';
  /** 前置图标 */
  icon?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean | ((row: T) => boolean);
  /** 是否显示（可用于权限控制） */
  show?: boolean | ((row: T) => boolean);
}

/**
 * 列定义接口
 * @template T - 数据行类型
 */
export interface ColumnDef<T = Record<string, unknown>> {
  /** 列唯一标识 */
  id: string;
  /** 列标题 */
  label?: string;
  /** @deprecated 请使用 label 字段 */
  header?: string;
  /** @deprecated 字段已通过 id 标识，无需额外配置 */
  accessor?: string;
  /** 列宽度 */
  width?: number | string;
  /** 最小宽度 */
  minWidth?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 文本对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义单元格渲染 */
  render?: (row: T, index: number) => React.ReactNode;
  /** 自定义表头渲染 */
  renderHeader?: (column: ColumnDef<T>) => React.ReactNode;
  /** 是否可配置显示/隐藏 */
  configurable?: boolean;
  /** 列顺序（用于列配置中的排序） */
  order?: number;
  /** 是否可调整列宽，默认 false */
  resizable?: boolean;
  /** 固定列位置，'left' 固定在左侧，'right' 固定在右侧 */
  fixed?: 'left' | 'right';
  /** 是否为树节点列（树形表格的展开列） */
  treeColumn?: boolean;
  /** 汇总类型，用于表尾汇总行 */
  summaryType?: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'custom';
  /** 自定义汇总渲染函数 */
  summaryRender?: (data: T[]) => React.ReactNode;
  /** 是否可编辑（行内编辑），默认 false */
  editable?: boolean;
  /** 行内编辑配置 */
  inlineEdit?: {
    type?: 'text' | 'select' | 'number' | 'date' | 'datetime' | 'checkbox';
    options?: { value: string | number; label: string }[];
  };
}

/**
 * 筛选选项接口
 */
export interface FilterOption {
  /** 显示标签 */
  label: string;
  /** 选项值 */
  value: string | number;
}
export type { FilterConfig };

/**
 * 行操作接口
 * @template T - 数据行类型
 */
export interface RowAction<T = Record<string, unknown>> {
  /** 操作唯一标识（用于内置 CRUD 行操作的 React key） */
  key?: string;
  /** 操作标签 */
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: (row: T) => void;
  /** 跳转链接 */
  href?: string;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  /** 条件显示 */
  show?: (row: T) => boolean;
  /** 是否显示分隔线 */
  divider?: boolean;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认提示信息 */
  confirmMessage?: string;
}

/**
 * 展开行渲染属性
 * @template T - 数据行类型
 */
export interface ExpandedRowRenderProps<T = Record<string, unknown>> {
  /** 当前行数据 */
  row: T;
  /** 行索引 */
  index: number;
}

/**
 * 列配置接口（用于列显示/隐藏配置）
 */
export interface ColumnConfig {
  /** 列ID */
  id: string;
  /** 是否显示 */
  visible: boolean;
  /** 列顺序 */
  order?: number;
}

/**
 * 批量操作接口
 */
export interface BatchAction<T = Record<string, unknown>> {
  /** 操作标签 */
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  /** 点击回调 */
  onClick: (selectedRows: T[]) => void;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认提示信息 */
  confirmMessage?: string;
  /** 是否在有选择时显示 */
  showWhenSelected?: boolean;
  /** 最小选择数量 */
  minSelected?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 根据选中行智能判断是否禁用 */
  disabledWhen?: (selectedRows: T[]) => boolean;
}

export interface ListPageTemplateProps<T = Record<string, unknown>> extends BoxProps {
  // 页面信息
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** 是否启用自动面包屑（默认启用） */
  autoBreadcrumbs?: boolean;
  /** 返回按钮配置 */
  backButton?: {
    href?: string;
    onClick?: () => void;
  };

  // 数据
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  error?: string;

  // 行标识
  getRowId?: (row: T) => string | number;
  onRowClick?: (row: T) => void;

  // 选择
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** 批量选择配置 */
  selection?: {
    selected?: (string | number)[];
    onChange?: (ids: (string | number)[]) => void;
  };

  // 排序
  sortable?: boolean;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // 分页
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  /** 当前页码（兼容旧版API，优先使用 pagination） */
  page?: number;
  /** 每页条数（兼容旧版API，优先使用 pagination） */
  pageSize?: number;
  /** 总条数（兼容旧版API，优先使用 pagination） */
  total?: number;
  /** 页码变化回调（兼容旧版API，优先使用 pagination） */
  onPageChange?: (page: number) => void;
  /** 每页条数变化回调（兼容旧版API，优先使用 pagination） */
  onPageSizeChange?: (pageSize: number) => void;

  // 搜索
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  /** 搜索值变化回调（兼容旧版API，与 onSearch 作用相同） */
  onSearchChange?: (value: string) => void;
  /** 自定义筛选内容（兼容旧版API，会渲染在 headerContent 中） */
  filterContent?: React.ReactNode;
  /** 全局搜索配置 - 支持搜索多个字段 */
  globalSearch?: {
    fields: string[];
    placeholder?: string;
  };

  // 筛选
  filters?: FilterConfig[];
  /** 受控的筛选值（与 onFilterChange 配合使用） */
  filtersValue?: Record<string, unknown>;
  onFilterChange?: (filters: Record<string, unknown>) => void;

  // 操作
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    variant?: 'contained' | 'outlined' | 'text';
  }>;
  rowActions?: RowAction<T>[];
  /**
   * 自定义行操作渲染函数（与 rowActions 二选一，优先级更高）
   */
  renderRowActions?: (row: T, index: number) => React.ReactNode;
  /**
   * 自定义操作按钮区域（渲染在筛选栏下方、表格上方）
   * @deprecated 推荐使用 headerContent
   */
  customActions?: React.ReactNode;
  onRefresh?: () => void;
  /** 是否在顶部显示批量操作栏 */
  showBatchActionBar?: boolean;

  // 空状态
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;

  // 自定义
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;

  // ============ 新增功能 ============

  /**
   * 行展开配置
   * 设置为 true 启用行展开功能，或传入自定义渲染函数
   */
  expandable?: boolean | ((row: T, index: number) => React.ReactNode);
  /** 默认展开的行ID数组 */
  defaultExpandedIds?: (string | number)[];
  /** 展开状态变化回调 */
  onExpandedChange?: (expandedIds: (string | number)[]) => void;

  /**
   * 列配置功能
   * 设置为 true 显示列配置按钮，允许用户显示/隐藏列
   */
  columnConfigurable?: boolean;
  /** 默认列配置 */
  defaultColumnConfig?: ColumnConfig[];
  /** 列配置变化回调 */
  onColumnConfigChange?: (config: ColumnConfig[]) => void;
  /** 是否持久化列配置到localStorage */
  persistColumnConfig?: boolean;
  /** 列配置存储的key */
  columnConfigStorageKey?: string;

  /**
   * 列宽调整功能
   * 设置为 true 允许用户拖拽调整列宽
   */
  columnResizable?: boolean;
  /** 默认列宽（像素），用于未指定 width 的列 */
  defaultColumnWidth?: number;
  /** 最小列宽（像素），默认 80 */
  minColumnWidth?: number;
  /** 最大列宽（像素），默认 600 */
  maxColumnWidth?: number;
  /** 是否持久化列宽到 localStorage，默认 true */
  persistColumnWidth?: boolean;
  /** 列宽存储的 key */
  columnWidthStorageKey?: string;
  /** 列宽变化回调 */
  onColumnWidthChange?: (columnWidths: Record<string, number>) => void;

  // 树形表格配置
  /** 是否为树形数据，默认 false */
  treeView?: boolean;
  /** 子节点数据字段名，默认 'children' */
  treeChildrenField?: string;
  /** 树节点唯一标识字段名，默认 'id' */
  treeNodeKeyField?: string;
  /** 默认展开的节点 ID 列表 */
  defaultExpandedKeys?: (string | number)[];
  /** 受控的展开节点 ID 列表 */
  expandedKeys?: (string | number)[];
  /** 展开节点变化回调 */
  onExpandedKeysChange?: (keys: (string | number)[]) => void;
  /** 树形表格每一层级缩进（像素），默认 24 */
  treeIndentSize?: number;
  /** 懒加载子节点函数 */
  loadTreeChildren?: (row: T) => Promise<T[]>;

  // 汇总行配置
  /** 是否显示汇总行，默认 false */
  showSummary?: boolean;
  /** 汇总行位置，'top' 表头下方或 'bottom' 表尾，默认 'bottom' */
  summaryPosition?: 'top' | 'bottom';

  // 行内编辑配置
  /** 是否启用行内编辑，默认 false */
  inlineEditable?: boolean;
  /** 行内编辑模式：'cell' 单元格编辑 / 'row' 整行编辑，默认 'cell' */
  inlineEditMode?: 'cell' | 'row';
  /** 行内编辑保存回调 */
  onInlineEditSave?: (row: T, changes: Partial<T>) => Promise<void> | void;
  /** 行内编辑取消回调 */
  onInlineEditCancel?: (row: T) => void;
  /** 正在编辑的行 ID（受控） */
  editingRowId?: string | number | null;
  /** 正在编辑的行 ID 变化回调 */
  onEditingRowIdChange?: (id: string | number | null) => void;

  /** 是否显示行号 */
  showRowNumber?: boolean;
  /** 是否启用斑马纹（默认 false） */
  striped?: boolean;
  /** 主要操作按钮（渐变样式，渲染在其他操作按钮之前） */
  primaryActionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    gradient?: string;
  };

  /** 是否启用导出功能 */
  exportable?: boolean;
  /** 导出文件名（不含扩展名） */
  exportFileName?: string;
  /** 导出格式：csv / excel / json（默认 csv） */
  exportFormat?: 'csv' | 'excel' | 'json';
  /** 可用的导出格式列表，默认 ['csv', 'json'] */
  exportFormats?: Array<'csv' | 'excel' | 'json'>;
  /** 导出范围：当前页/全部数据/选中项，默认 ['current', 'all', 'selected'] */
  exportScopes?: Array<'current' | 'all' | 'selected'>;
  /** 自定义导出数据转换函数 */
  exportTransform?: (row: T) => Record<string, unknown>;
  /** 导出列配置（指定导出哪些列） */
  exportColumns?: string[];
  /** 是否在导出时包含表头，默认 true */
  exportIncludeHeader?: boolean;

  /** 是否持久化筛选条件到 localStorage */
  persistFilters?: boolean;
  /** 筛选条件存储的 key（默认使用页面路径） */
  filterStorageKey?: string;

  /** 是否持久化搜索关键词到 localStorage */
  persistSearch?: boolean;

  /**
   * 内置列表页状态管理
   * 传入配置后，模板内部使用 useListPageState 统一管理搜索、防抖和分页，
   * 调用方无需手动维护 useState/useEffect 样板代码。
   *
   * - 搜索输入框自动绑定内部 searchQuery，防抖后触发 onDebouncedSearch
   * - 分页控件自动绑定内部 currentPage / pageSize
   * - 调用方仍需提供 total（通过 pagination.total 或 total prop）
   *
   * 与受控模式（searchValue/pagination）互斥，受控模式优先级更高。
   */
  internalListState?: {
    /** 初始搜索关键词 */
    defaultSearch?: string;
    /** 分页索引基数：1（默认）或 0 */
    baseIndex?: 0 | 1;
    /** 初始页码 */
    defaultPage?: number;
    /** 每页条数，默认 10 */
    defaultPageSize?: number;
    /** 搜索防抖延迟（毫秒），默认 300 */
    debounceMs?: number;
    /** 初始筛选条件，默认 {} */
    defaultFilters?: Record<string, unknown>;
    /** 初始排序字段，默认 '' */
    defaultSortBy?: string;
    /** 初始排序方向，默认 'asc' */
    defaultSortOrder?: 'asc' | 'desc';
    /** 筛选变化时是否重置到第一页，默认 true */
    resetPageOnFilterChange?: boolean;
    /** 排序变化时是否重置到第一页，默认 true */
    resetPageOnSortChange?: boolean;
    /** URL 参数前缀，避免同页多列表冲突 */
    urlPrefix?: string;
    /**
     * 是否启用 URL 状态同步：
     * - `false`（默认）：仅内存状态（useListPageState）
     * - `'replace'`：同步到 URL，使用 replace 模式（不产生历史记录）
     * - `'push'`：同步到 URL，使用 push 模式（前进后退可感知）
     */
    urlSync?: false | 'replace' | 'push';
  };
  /** 防抖搜索值变化回调（仅 internalListState 模式下生效） */
  onDebouncedSearch?: (value: string) => void;

  /** 空状态操作按钮 */
  emptyActionButton?: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  };

  /** 快捷筛选预设 */
  quickFilters?: Array<{
    /** 唯一标识（用于 URL 同步，不传则用索引） */
    key?: string;
    label: string;
    filters: Record<string, unknown>;
    searchValue?: string;
  }>;

  /** 批量操作配置 */
  batchActions?: BatchAction<T>[];

  /** 是否启用批量选择 */
  enableBatchSelection?: boolean;

  /**
   * 视图模式：表格视图 / 卡片视图
   * - 受控模式：传入 viewMode + onViewModeChange
   * - 非受控模式：传入 defaultViewMode
   * - 配合 internalListState.urlSync 使用时自动同步到 URL
   */
  viewMode?: ListViewMode;
  /** 默认视图模式（非受控模式） */
  defaultViewMode?: ListViewMode;
  /** 视图模式变化回调 */
  onViewModeChange?: (mode: ListViewMode) => void;
  /**
   * 可用视图模式列表，默认 ['table', 'card']
   * 用于控制工具栏中显示哪些视图切换按钮
   */
  viewModes?: ListViewMode[];
  /**
   * 卡片视图渲染函数（仅 viewMode='card' 时使用）
   * 未提供时降级为表格视图
   */
  renderCardView?: (data: T[]) => React.ReactNode;
  /**
   * 单张卡片渲染函数（仅 viewMode='card' 且未提供 renderCardView 时使用）
   * 组件会自动遍历数据并渲染卡片列表
   */
  renderCardItem?: (row: T, index: number) => React.ReactNode;
  /** 卡片视图的栅格列数，默认 3（lg）/2（md）/1（sm） */
  cardGridColumns?: number;
  /**
   * 卡片视图配置（使用内置标准卡片布局）
   * 提供后自动启用卡片视图，无需额外提供 renderCardItem
   */
  cardViewConfig?: CardViewConfig<T>;

  /**
   * 移动端卡片视图渲染函数
   * 在小屏设备（< md 断点）下替代表格视图，渲染为卡片列表
   * 若未提供，但提供了 mobileCardTitleKey，则使用默认卡片布局
   */
  mobileCardRender?: (row: T, index: number) => React.ReactNode;

  /**
   * 移动端卡片视图的标题字段名
   * 用于卡片标题展示，配合默认卡片渲染使用
   */
  mobileCardTitleKey?: string;

  /**
   * 移动端卡片视图的副标题字段名
   */
  mobileCardSubtitleKey?: string;

  /**
   * 移动端卡片视图中需要展示的字段列表
   * 默认展示所有可见列的字段
   */
  mobileCardDisplayFields?: string[];

  /**
   * 移动端卡片视图的字段标签映射
   * 用于将字段名转换为可读标签
   */
  mobileCardFieldLabels?: Record<string, string>;

  /**
   * 声明式 CRUD 配置（实验性）
   *
   * 传入后模板内部自动完成：
   * - 数据获取（useCrudOperations）
   * - 搜索/筛选/排序/分页状态管理（useUrlListState / useListPageState）
   * - URL 状态同步（可选）
   * - CRUD 操作（create/update/delete）
   *
   * 启用后，`data` / `loading` / `pagination` / `searchValue` 等受控 prop 仍优先；
   * 未提供时由内部自动接管。
   */
  crud?: ListPageCrudConfig<T>;

  /**
   * URL 状态同步（便捷开关）
   *
   * 启用后，搜索关键词、筛选条件、排序、分页参数将同步到 URL search params，
   * 支持浏览器前进/后退、链接分享、刷新保持状态。
   *
   * 等效于 `internalListState={{ urlSync: 'replace' }}` 的便捷写法。
   * 仅 internalListState / crud 模式下生效。
   *
   * - `false`（默认）：仅内存状态
   * - `'replace'`：同步到 URL，使用 replace 模式（不产生历史记录）
   * - `'push'`：同步到 URL，使用 push 模式（前进后退可感知）
   */
  urlSync?: false | 'replace' | 'push';

  /** URL 参数前缀，避免同页面多列表冲突（仅 urlSync 启用时有效） */
  urlPrefix?: string;

  /**
   * 列配置 URL 同步（实验性）
   *
   * 启用后，列的显示/隐藏、顺序将同步到 URL，支持链接分享和前进后退。
   * 同时仍会持久化到 localStorage（作为 URL 无值时的回退）。
   */
  columnConfig?: {
    /** 列配置的唯一标识（用于 localStorage key） */
    key: string;
    /** URL 同步模式：false / 'replace' / 'push'，默认 false */
    urlSync?: false | 'replace' | 'push';
    /** URL 参数前缀 */
    urlPrefix?: string;
  };
}

// ============ 声明式 CRUD 配置 ============

export interface ListPageCrudConfig<
  T = Record<string, unknown>,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> {
  /** 实现标准 CrudOperations 接口的 API 对象 */
  api: {
    list: (params?: Record<string, unknown>) => Promise<{
      success: boolean;
      code: number;
      message: string;
      data?: { items: T[]; total: number; page?: number; page_size?: number };
    }>;
    get: (id: string) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
    create: (
      data: TCreate
    ) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
    update: (
      id: string,
      data: TUpdate
    ) => Promise<{ success: boolean; code: number; message: string; data?: T }>;
    delete: (
      id: string
    ) => Promise<{ success: boolean; code: number; message: string; data?: string }>;
  };
  /** React Query queryKey 前缀，如 'hrm-employees' */
  queryKey: string;
  /** 实体名称，用于通知消息（如"用户"） */
  entityName?: string;
  /** 是否自动获取列表，默认 true */
  autoFetch?: boolean;
  /** 每页条数，默认 10 */
  defaultPageSize?: number;
  /** 分页参数名，默认 'page' */
  pageParamName?: string;
  /** 每页条数参数名，默认 'page_size' */
  pageSizeParamName?: string;
  /** 搜索参数名，默认 'keyword' */
  searchParamName?: string;
  /** 排序字段参数名，默认 'sortBy' */
  sortByParamName?: string;
  /** 排序方向参数名，默认 'sortOrder' */
  sortOrderParamName?: string;
  /**
   * URL 同步模式：
   * - `false`（默认）：仅内存状态
   * - `'replace'`：同步到 URL，replace 模式
   * - `'push'`：同步到 URL，push 模式
   */
  urlSync?: false | 'replace' | 'push';
  /** URL 参数前缀，同页多列表隔离 */
  urlPrefix?: string;
  /**
   * 列表参数转换：在发送请求前，将内部状态（搜索/筛选/排序/分页）转换为后端期望的参数格式
   * 用于适配不同后端的参数规范
   *
   * 如果同时设置了 `paramStyle`，`transformParams` 的优先级更高。
   */
  transformParams?: (params: ListPageStateParams) => Record<string, unknown>;
  /**
   * 后端参数风格预设，快速适配常见后端规范
   * - `'standard'`：page, page_size, keyword, sortBy, sortOrder, 筛选平铺
   * - `'nested'`：filters 对象 + sort 对象
   * - `'offset'`：offset + limit 分页
   *
   * 默认 `'standard'`（TOPEMS 后端风格）
   *
   * 如需更细粒度控制，可使用 `transformParams` 完全自定义。
   */
  paramStyle?: 'standard' | 'nested' | 'offset';
  /** 字段名映射（前端字段名 -> 后端字段名），用于筛选和排序字段 */
  fieldMapping?: Record<string, string>;
  /** 数据加载成功回调，可用于二次处理数据 */
  onDataLoaded?: (data: T[], total: number) => void;
  /** 数据加载错误回调 */
  onDataError?: (error: Error) => void;
  /**
   * 是否启用行选择，默认 false
   * 启用后模板内部管理 selectedIds，并暴露给外部
   */
  selectable?: boolean;
  /** 行选择变化回调 */
  onSelectionChange?: (selectedIds: (string | number)[], selectedRows: T[]) => void;
  /**
   * 编辑模式：对话框 / 抽屉
   * - `'dialog'`（默认）：使用 FormDialog 弹窗编辑
   * - `'drawer'`：使用 FormDrawer 抽屉编辑
   *
   * 需配合 `renderForm` 或 `formFields` 使用。
   */
  editMode?: 'dialog' | 'drawer';
  /** 编辑抽屉宽度，默认 480px（仅 editMode='drawer' 时生效） */
  drawerWidth?: number | string;
  /** 编辑抽屉方向，默认 'right'（仅 editMode='drawer' 时生效） */
  drawerAnchor?: 'left' | 'right' | 'top' | 'bottom';
  /** 编辑对话框尺寸，默认 'sm'（仅 editMode='dialog' 时生效） */
  dialogMaxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * 渲染编辑/新建表单内容
   *
   * 配合 editMode 使用，返回表单内容 JSX。
   * 表单的打开/关闭/提交状态由模板内部管理。
   */
  renderForm?: (props: {
    mode: 'create' | 'edit' | 'view';
    record: T | null;
    submitting: boolean;
    onSubmit: (data: TCreate | TUpdate) => Promise<boolean>;
    onClose: () => void;
  }) => React.ReactNode;
  /** 新建按钮文本，默认 '新建' */
  createButtonText?: string;
  /** 是否显示新建按钮，默认 true */
  showCreateButton?: boolean;
  /**
   * 表单字段配置（简化模式）
   *
   * 提供字段配置后自动生成表单，无需手写 renderForm。
   * 支持 text/number/select/textarea/email/password/date 等常用类型。
   *
   * 如需更复杂的表单，使用 renderForm 替代。
   */
  formFields?: CrudFormFieldConfig[];
  /** 表单每行显示的字段数，默认 1 */
  formColCount?: number;
  /** 表单提交前数据转换（将表单数据转换为 API 需要的格式） */
  transformFormData?: (
    formData: Record<string, unknown>,
    mode: 'create' | 'edit'
  ) => TCreate | TUpdate;
  /**
   * 自定义行操作
   *
   * 除了内置的查看/编辑/删除操作外，还可以添加自定义行操作。
   * 自定义操作会追加在内置操作之后。
   */
  rowActions?: RowAction<T>[];
  /**
   * 自定义批量操作
   *
   * 除了内置的批量删除操作外，还可以添加自定义批量操作。
   * 自定义操作会追加在内置操作之后。
   */
  bulkActions?: BatchAction<T>[];
  /**
   * 是否启用卡片视图，默认 false
   * 启用后工具栏显示视图切换按钮，支持表格/卡片视图切换
   */
  cardView?: boolean;
  /**
   * 卡片视图每行显示的字段数，默认 2
   */
  cardFieldsPerRow?: number;
  /**
   * 卡片视图的栅格列数配置
   */
  cardGridColumns?: number;
  /**
   * 状态颜色映射（用于卡片视图的状态 Chip）
   */
  cardStatusColorMap?: Record<
    string,
    'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  >;
  /**
   * 状态标签映射（用于卡片视图的状态 Chip）
   */
  cardStatusLabelMap?: Record<string, string>;
  /**
   * 是否启用搜索，默认 true
   */
  searchable?: boolean;
  /**
   * 搜索占位文本
   */
  searchPlaceholder?: string;
  /**
   * 搜索字段（指定搜索时搜索哪些字段，默认搜索 name/title/code 等常见字段）
   */
  searchFields?: string[];
  /**
   * 是否启用筛选，默认 false
   * 当 formFields 中有 select 类型的字段时自动推断为 true
   */
  filterable?: boolean;
  /**
   * 自动从 formFields 生成筛选配置，默认 true
   */
  autoGenerateFilters?: boolean;
  /**
   * 点击表格行是否打开查看详情，默认 true（有表单时生效）
   */
  clickRowToView?: boolean;
  /**
   * 行悬停高亮，默认 true
   */
  rowHover?: boolean;
  /**
   * 表单分组的顺序和标题配置（按分组顺序渲染，未指定分组的字段放在最后）
   */
  formGroups?: {
    key: string;
    title: string;
    description?: string;
  }[];
  /**
   * 是否显示数据统计卡片，默认 false
   */
  showStatsCards?: boolean;
  /**
   * 统计卡片配置（自动生成时可覆盖）
   */
  statsCards?: Array<{
    key: string;
    label: string;
    value?: number | string;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
    icon?: React.ReactNode;
  }>;
  /**
   * 用于状态统计的字段 key（指定后自动生成该字段各状态的统计卡片）
   */
  statsStatusField?: string;
  /**
   * 是否自动生成快速筛选，默认 false
   */
  autoQuickFilters?: boolean;
  /**
   * 用于快速筛选的字段 key（默认使用 status/state 字段）
   */
  quickFilterField?: string;
  /**
   * 快速筛选是否包含"全部"选项，默认 true
   */
  quickFilterShowAll?: boolean;
  /**
   * 双击行是否打开编辑表单，默认 true（有表单且有编辑权限时生效）
   */
  doubleClickToEdit?: boolean;
  /**
   * 行操作菜单中是否显示"更多"按钮，默认 true（当 rowActions 超过3个时）
   */
  showMoreActions?: boolean;
  /**
   * 行操作菜单中显示在"更多"里的操作 key 列表
   */
  moreActions?: string[];
  /**
   * 表单数据变化时的回调，可用于计算字段值、联动更新等
   */
  onFormDataChange?: (
    formData: Record<string, unknown>,
    changedKey: string
  ) => Record<string, unknown> | void;
  /**
   * 是否显示表单重置按钮（create模式下），默认 false
   */
  showResetButton?: boolean;
  /**
   * 是否启用导出功能，默认 false
   */
  exportable?: boolean;
  /**
   * 导出文件名（不含扩展名），默认使用实体名称
   */
  exportFileName?: string;
  /**
   * 可用的导出格式，默认 ['csv', 'json']
   */
  exportFormats?: Array<'csv' | 'excel' | 'json'>;
  /**
   * 导出范围选项，默认 ['current', 'all', 'selected']
   */
  exportScopes?: Array<'current' | 'all' | 'selected'>;
  /**
   * 是否在导出时隐藏的字段 key 列表
   */
  exportExcludeFields?: string[];
  /**
   * 是否启用列宽调整，默认 false
   */
  columnResizable?: boolean;
  /**
   * 默认列宽（像素），用于未指定 tableWidth 的列
   */
  defaultColumnWidth?: number;
  /**
   * 最小列宽（像素），默认 80
   */
  minColumnWidth?: number;
  /**
   * 最大列宽（像素），默认 600
   */
  maxColumnWidth?: number;
  /**
   * 是否为树形数据，默认 false
   */
  treeView?: boolean;
  /**
   * 子节点数据字段名，默认 'children'
   */
  treeChildrenField?: string;
  /**
   * 树节点唯一标识字段名，默认 'id'
   */
  treeNodeKeyField?: string;
  /**
   * 默认展开的节点 ID 列表
   */
  defaultExpandedKeys?: (string | number)[];
  /**
   * 树形表格每一层级缩进（像素），默认 24
   */
  treeIndentSize?: number;
  /**
   * 是否显示汇总行，默认 false
   */
  showSummary?: boolean;
  /**
   * 汇总行位置，'top' 表头下方或 'bottom' 表尾，默认 'bottom'
   */
  summaryPosition?: 'top' | 'bottom';
  /**
   * 是否启用行内编辑，默认 false
   */
  inlineEditable?: boolean;
  /**
   * 行内编辑模式：'cell' 单元格编辑 / 'row' 整行编辑，默认 'cell'
   */
  inlineEditMode?: 'cell' | 'row';
}

/** CRUD 表单字段配置 */
export interface CrudFormFieldConfig {
  /** 字段名（对应数据对象的 key） */
  key: string;
  /** 显示标签 */
  label: string;
  /** 字段类型 */
  type:
    | 'text'
    | 'number'
    | 'select'
    | 'textarea'
    | 'email'
    | 'password'
    | 'date'
    | 'switch'
    | 'radio'
    | 'checkbox'
    | 'numberRange';
  /** 数字类型的最小值 */
  min?: number;
  /** 数字类型的最大值 */
  max?: number;
  /** 数字类型的步长 */
  step?: number;
  /** 单选/复选的选项排列方向，默认 vertical */
  optionLayout?: 'horizontal' | 'vertical';
  /** 是否必填，默认 false */
  required?: boolean;
  /** 是否禁用，默认 false */
  disabled?: boolean;
  /** 占位文本 */
  placeholder?: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** select 类型的选项 */
  options?: { value: string | number; label: string }[];
  /** textarea 行数 */
  rows?: number;
  /** 在网格中占几列，默认 1 */
  colSpan?: number;
  /** 表单分组 key（与 formGroups 配合使用） */
  group?: string;
  /** 条件显示：返回 true 时显示该字段（基于当前表单数据判断） */
  visibleWhen?: (formData: Record<string, unknown>) => boolean;
  /** 条件禁用：返回 true 时禁用该字段（基于当前表单数据判断） */
  disabledWhen?: (formData: Record<string, unknown>) => boolean;
  /** 是否在 view 模式下隐藏 */
  hideInView?: boolean;
  /** 是否在 create 模式下隐藏 */
  hideInCreate?: boolean;
  /** 是否在 edit 模式下隐藏 */
  hideInEdit?: boolean;
  /** 是否在表格列中隐藏，默认 false */
  hideInTable?: boolean;
  /** 表格列宽度 */
  tableWidth?: number | string;
  /** 表格列是否可排序，默认 true */
  tableSortable?: boolean;
  /** 表格列自定义渲染 */
  tableRender?: (value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode;
  /** 表格列是否显示为状态 Chip，默认 false */
  tableStatus?: boolean;
  /** 状态颜色映射（用于表格列状态 Chip，与 tableStatus 配合使用） */
  tableStatusColorMap?: Record<
    string,
    'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  >;
  /** 状态标签映射（用于表格列状态 Chip，与 tableStatus 配合使用） */
  tableStatusLabelMap?: Record<string, string>;
  /** 是否在卡片视图中隐藏，默认 false */
  hideInCard?: boolean;
  /** 是否作为卡片标题字段（第一个标记为 title 的字段生效） */
  cardTitle?: boolean;
  /** 是否作为卡片副标题字段（第一个标记为 subtitle 的字段生效） */
  cardSubtitle?: boolean;
  /** 是否作为卡片状态字段（第一个标记为 status 的字段生效） */
  cardStatus?: boolean;
  /** 在卡片视图中的显示顺序（越小越靠前） */
  cardOrder?: number;
  /** 是否在导出时隐藏，默认 false */
  hideInExport?: boolean;
  /** 导出时的列宽（仅用于 excel 格式） */
  exportColumnWidth?: number;
  /** 导出时的值格式化函数 */
  exportFormat?: (value: unknown, row: Record<string, unknown>) => string | number | boolean;
  /** 表格列固定位置，'left' 固定在左侧，'right' 固定在右侧 */
  tableFixed?: 'left' | 'right';
  /** 是否为树节点列（树形表格的展开列） */
  tableTreeColumn?: boolean;
  /** 表格列汇总类型，用于表尾汇总行 */
  tableSummaryType?: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'custom';
  /** 表格列自定义汇总渲染函数 */
  tableSummaryRender?: (data: Record<string, unknown>[]) => React.ReactNode;
  /** 表格列是否可编辑（行内编辑），默认 false */
  tableEditable?: boolean;
  /** 验证规则 */
  rules?: CrudFormFieldRule[];
  /** 自定义渲染 */
  render?: (props: {
    value: unknown;
    onChange: (value: unknown) => void;
    mode: 'create' | 'edit' | 'view';
  }) => React.ReactNode;
}

/** 表单字段验证规则 */
interface CrudFormFieldRule {
  /** 验证类型 */
  type?: 'required' | 'email' | 'number' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern';
  /** 验证失败时的提示信息 */
  message: string;
  /** 最小值（type=number/min 时使用） */
  min?: number;
  /** 最大值（type=number/max 时使用） */
  max?: number;
  /** 最小长度（type=minLength 时使用） */
  minLength?: number;
  /** 最大长度（type=maxLength 时使用） */
  maxLength?: number;
  /** 正则表达式（type=pattern 时使用） */
  pattern?: RegExp;
  /** 自定义验证函数 */
  validator?: (value: unknown) => boolean | string;
}

/** 列表页内部状态参数（用于 transformParams 的输入） */
export interface ListPageStateParams {
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  filters: Record<string, unknown>;
}

// ============ 工具函数 ============

/**
 * 从localStorage读取列配置
 */
export const loadColumnConfig = (key: string): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(`listpage:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

/**
 * 保存列配置到localStorage
 */
export const saveColumnConfig = (key: string, config: ColumnConfig[]): void => {
  try {
    localStorage.setItem(`listpage:${key}`, JSON.stringify(config));
  } catch {
    // ignore
  }
};
