/**
 * MUI 增强组件库
 *
 * 注意：部分组件已迁移到 common/ 或 templates/ 目录
 * 请优先使用对应目录下的版本
 *
 * @deprecated 本目录下的组件已整合到 common/ 和 templates/ 目录
 * - StatCard -> common/StatCard
 * - DataGrid -> common/DataTable
 * - FilterBar -> common/AdvancedFilter
 * - EmptyState -> templates/EmptyState
 * - LoadingState -> common/LoadingSpinner
 */

// 数据展示 - 已整合到 common/DataTable
export { DataGrid } from './DataGrid';
export type { DataGridColumn, DataGridAction, DataGridBulkAction, DataGridProps } from './DataGrid';

// 数据录入
export { SearchInput } from './SearchInput';
export type { SearchSuggestion, SearchInputProps } from './SearchInput';

// 筛选 - 已整合到 common/AdvancedFilter
export { FilterBar } from './FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './FilterBar';

// 状态展示 - StatCard 和 StatCardGroup
export { StatCard, StatCardGroup } from './StatCard';
export type { StatCardProps, StatCardGroupProps } from './StatCard';

// 状态展示 - EmptyState
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// 状态展示 - 已整合到 common/LoadingSpinner
export { LoadingState, InlineLoading, ButtonLoading } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

// 操作栏
export { ActionBar, QuickActionBar } from './ActionBar';
export type { Action, ActionBarProps, QuickActionBarProps } from './ActionBar';

// 页面模板 - 统一使用 templates/ 目录
export { ListPageTemplate } from '../templates/ListPageTemplate';
export type {
  ColumnDef,
  RowAction,
  BatchAction,
  ListPageTemplateProps,
} from '../templates/ListPageTemplate';

export { DashboardTemplate } from '../templates/DashboardTemplate';
export type {
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from '../templates/DashboardTemplate';
