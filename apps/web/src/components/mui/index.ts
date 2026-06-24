// MUI 增强组件库
// 基于 MUI 的业务组件封装

// 数据展示
export { DataGrid } from './DataGrid';
export type { DataGridColumn, DataGridAction, DataGridBulkAction, DataGridProps } from './DataGrid';

// 数据录入
export { SearchInput } from './SearchInput';
export type { SearchSuggestion, SearchInputProps } from './SearchInput';

export { FilterBar } from './FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './FilterBar';

// 状态展示
export { StatCard, StatCardGroup } from './StatCard';
export type { StatCardProps, StatCardGroupProps } from './StatCard';

export {
  EmptyState,
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
} from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { LoadingState, InlineLoading, ButtonLoading } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

// 操作栏
export { ActionBar, QuickActionBar } from './ActionBar';
export type { Action, ActionBarProps, QuickActionBarProps } from './ActionBar';

// 页面模板
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
