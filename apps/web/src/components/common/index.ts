/**
 * 公共组件导出配置
 *
 * 注意：部分组件已迁移到 templates 目录，并在原位置标记为 deprecated
 * 请优先使用 templates 目录下的新版本组件
 */

// DataTable - 已增强，整合了EnhancedDataTable的功能
export { DataTable } from './DataTable';
export type { DataTableProps, DataTableRow, ExpandedRowRender, AdvancedFilter } from './DataTable';

// FormBuilder - 保留原导出
export { default as FormBuilder } from './FormBuilder';
export type { FormFieldConfig, FormBuilderConfig } from './FormBuilder';

// Dialog - 统一对话框组件
export { Dialog } from './Dialog';
export type { DialogProps, DialogSize } from './Dialog';

// ConfirmDialog - 已增强，保留原导出
export {
  default as ConfirmDialog,
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
} from './ConfirmDialog';
export type { ConfirmDialogConfig } from './ConfirmDialog';

// PaginationComponent - 保留原导出
export { default as PaginationComponent } from './Pagination';
export type { PaginationConfig } from './Pagination';

// ProgressBar - 保留原导出
export { default as ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

// TreeView - 保留原导出
export { default as TreeView } from './TreeView';
export type { TreeNode, TreeViewProps } from './TreeView';

// Stepper - 保留原导出
export { default as Stepper } from './Stepper';
export type { StepperProps, StepItem } from './Stepper';

// HelpButton - 保留原导出
export { default as HelpButton } from './HelpButton';
export type { HelpButtonProps } from './HelpButton';

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as AlertCard } from './AlertCard';
export type { AlertCardProps } from './AlertCard';

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as StatCard } from './StatCard';
export type { StatCardBaseProps, MetricCardProps, ChartCardProps } from './StatCard';

// AmountDisplay - 保留原导出
export { default as AmountDisplay } from './AmountDisplay';
export type { AmountDisplayProps } from './AmountDisplay';

// DateRangeQuickSelect - 快速日期范围选择
export { default as DateRangeQuickSelect } from './DateRangeQuickSelect';
export type { DateRangeQuickSelectProps, DateRange } from './DateRangeQuickSelect';

// RelativeTime - 相对时间显示
export { default as RelativeTime } from './RelativeTime';
export type { RelativeTimeProps } from './RelativeTime';

// DateRangePicker - 保留原导出
export { default as DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps } from './DateRangePicker';

// ImageUpload - 保留原导出
export { default as ImageUpload } from './ImageUpload';
export type { ImageUploadProps } from './ImageUpload';

// FileUpload - 保留原导出
export { default as FileUpload } from './FileUpload';
export type { FileUploadProps } from './FileUpload';

// DataExport - 保留原导出
export { default as DataExport } from './DataExport';
export type { DataExportProps, ExportField, ExportFormat } from './DataExport';

// QuickSearch - 保留原导出
export { default as QuickSearch } from './QuickSearch';
export type { QuickSearchProps, SearchSuggestion, SearchHistoryItem } from './QuickSearch';

// StatusTimeline - 保留原导出
export { default as StatusTimeline } from './StatusTimeline';
export type { StatusTimelineProps, TimelineItem } from './StatusTimeline';

// CommentList - 保留原导出
export { default as CommentList } from './CommentList';
export type { CommentListProps, Comment } from './CommentList';

// UserSelect - 保留原导出
export { default as UserSelect } from './UserSelect';
export type { UserSelectProps, User } from './UserSelect';

// DepartmentSelect - 保留原导出
export { default as DepartmentSelect } from './DepartmentSelect';
export type { DepartmentSelectProps, Department } from './DepartmentSelect';

// Grid - Grid2 兼容组件
export { Grid } from './Grid';

// BackButton - 统一返回按钮（支持智能返回）
export { default as BackButton } from './BackButton';
export type { BackButtonProps } from './BackButton';

// ===== 统一表单组件 =====
// FormField - 统一 TextField 包装
export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

// FormSelect - 统一 Select 包装
export { default as FormSelect } from './FormSelect';
export type { FormSelectProps, FormSelectOption } from './FormSelect';

// ActionButton - 统一按钮组件
export { default as ActionButton } from './ActionButton';
export type { ActionButtonProps, ActionButtonVariant, ActionButtonSize } from './ActionButton';

// LoadingSpinner - 加载状态组件
export { default as LoadingSpinner } from './LoadingSpinner';
// 注意：LoadingSpinnerProps 是 interface，会自动导出

// AdvancedFilterPanel - 高级筛选面板组件
export { default as AdvancedFilterPanel } from './AdvancedFilter';
export type { AdvancedFilterProps, FilterCondition } from './AdvancedFilter';

// PageContainer - 统一页面容器组件
export { default as PageContainer } from './PageContainer';
export type { PageContainerProps } from './PageContainer';

// EmptyState - 空状态组件
export {
  EmptyState,
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
} from './EmptyState';
export type { EmptyStateProps, ErrorEmptyStateProps } from './EmptyState';

// FilterBar - 筛选栏组件
export { FilterBar } from './FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './FilterBar';

// MuiStatCard - MUI风格统计卡片（从mui/迁移）
export { StatCard as MuiStatCard, StatCardGroup } from './MuiStatCard';
export type { StatCardProps as MuiStatCardProps, StatCardGroupProps } from './MuiStatCard';
