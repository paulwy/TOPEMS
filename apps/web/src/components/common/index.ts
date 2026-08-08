/**
 * 公共组件导出配置
 *
 * 注意：部分组件已迁移到 templates 目录，并在原位置标记为 deprecated
 * 请优先使用 templates 目录下的新版本组件
 *
 * 标记为 [shared] 的组件已提升到 @topems/shared-components，
 * 此处保留 re-export 以保持向后兼容
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

// [shared] ConfirmDialog - 已提升到 @topems/shared-components
export {
  ConfirmDialog,
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
  type ConfirmDialogConfig,
  type DialogType,
  type DialogButtonType,
} from '@topems/shared-components';

// [shared] PaginationComponent - 已提升到 @topems/shared-components
export {
  Pagination as PaginationComponent,
  type PaginationConfig,
} from '@topems/shared-components';

// [shared] ProgressBar - 已提升到 @topems/shared-components
export { ProgressBar, type ProgressBarProps } from '@topems/shared-components';

// TreeView - 保留原导出
export { default as TreeView } from './TreeView';
export type { TreeNode, TreeViewProps } from './TreeView';

// [shared] Stepper - 已提升到 @topems/shared-components
export { Stepper, type StepperProps, type StepItem } from '@topems/shared-components';

// HelpButton - 保留原导出
export { default as HelpButton } from './HelpButton';
export type { HelpButtonProps } from './HelpButton';

// [shared] StatusBadge - 已提升到 @topems/shared-components
export { StatusBadge, type StatusBadgeProps } from '@topems/shared-components';

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

// [shared] RelativeTime - 已提升到 @topems/shared-components
export { RelativeTime, type RelativeTimeProps } from '@topems/shared-components';

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

// [shared] UserSelect - 已提升到 @topems/shared-components
export { UserSelect, type UserSelectProps } from '@topems/shared-components';
export type { User } from '@topems/shared-types';

// DepartmentSelect - 保留原导出
export { default as DepartmentSelect } from './DepartmentSelect';
export type { DepartmentSelectProps, Department } from './DepartmentSelect';

// Grid - Grid2 兼容组件
export { Grid } from './Grid';

// BackButton - 顶部导航返回/首页/关闭按钮
export { BackButton } from './BackButton';
export type { BackButtonProps, BackButtonVariant, BackButtonSize } from './BackButton';

// ===== 统一表单组件 =====
// [shared] FormField - 已提升到 @topems/shared-components
export { FormField, type FormFieldProps } from '@topems/shared-components';

// [shared] FormSelect - 已提升到 @topems/shared-components
export { FormSelect, type FormSelectProps, type FormSelectOption } from '@topems/shared-components';

// [shared] ActionButton - 已提升到 @topems/shared-components
export {
  ActionButton,
  type ActionButtonProps,
  type ActionButtonVariant,
  type ActionButtonSize,
} from '@topems/shared-components';

// [shared] LoadingSpinner - 已提升到 @topems/shared-components
export { LoadingSpinner } from '@topems/shared-components';

// AdvancedFilterPanel - 高级筛选面板组件
export { default as AdvancedFilterPanel } from './AdvancedFilter';
export type { AdvancedFilterProps, FilterCondition } from './AdvancedFilter';

// PageContainer - 统一页面容器组件 (支持autoTitle和autoBreadcrumbs)
export { default as PageContainer } from './PageContainer';
export type { PageContainerProps } from './PageContainer';

export { EmptyState, type EmptyStateProps } from './EmptyState';

export {
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
  type ErrorEmptyStateProps,
} from '@topems/shared-components';

// [shared] FilterBar - 已提升到 @topems/shared-components
export {
  FilterBar,
  type FilterOption,
  type FilterConfig,
  type FilterBarProps,
} from '@topems/shared-components';

// MuiStatCard - MUI风格统计卡片（从mui/迁移）
export { StatCard as MuiStatCard, StatCardGroup } from './MuiStatCard';
export type { StatCardProps as MuiStatCardProps, StatCardGroupProps } from './MuiStatCard';

// ===== 数字输入组件 (shared-components re-export) =====
export { NumberField, type NumberFieldProps } from './NumberFields';
export { CurrencyField, type CurrencyFieldProps } from './NumberFields';
export { PercentField, type PercentFieldProps } from './NumberFields';

// ErrorBoundary - 错误边界组件
export { ErrorBoundary } from './ErrorBoundary';

// TouchButton - 触控按钮组件
export { TouchButton, TouchRipple } from './TouchButton';

// TouchComponents - 触控交互组件扩展
export {
  TouchIconButton,
  TouchCard,
  TouchListItem,
  TouchChip,
  TouchSwitch,
  type TouchFeedbackOptions,
} from './TouchComponents';

// Drawer - 抽屉组件
export { Drawer } from './Drawer';
export type { DrawerProps, DrawerAnchor, DrawerVariant } from './Drawer';

// FormDrawer - 表单抽屉组件
export { FormDrawer } from './FormDrawer';
export type { FormDrawerProps } from './FormDrawer';

// FormDialog - 表单对话框组件
export { FormDialog } from './FormDialog';
export type { FormDialogProps } from './FormDialog';
