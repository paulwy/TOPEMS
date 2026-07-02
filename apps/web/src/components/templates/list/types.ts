import type React from 'react';
import type { BoxProps } from '@mui/material';

import type { FilterConfig } from '../../common/FilterBar';

// ============ 类型定义 ============

/**
 * 列定义接口
 * @template T - 数据行类型
 */
export interface ColumnDef<T = any> {
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
export interface RowAction<T = any> {
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
export interface ExpandedRowRenderProps<T = any> {
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
export interface BatchAction {
  /** 操作标签 */
  label: string;
  /** 操作图标 */
  icon?: React.ReactNode;
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  /** 点击回调 */
  onClick?: () => void;
  /** 是否需要确认 */
  confirm?: boolean;
  /** 确认提示信息 */
  confirmMessage?: string;
  /** 是否在有选择时显示 */
  showWhenSelected?: boolean;
  /** 最小选择数量 */
  minSelected?: number;
}

export interface ListPageTemplateProps<T = any> extends BoxProps {
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
  filtersValue?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;

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
  /** 批量操作按钮 */
  batchActions?: BatchAction[];
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

  // ============ 移动端卡片视图 ============

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
