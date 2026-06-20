/**
 * 公共组件导出配置
 *
 * 注意：部分组件已迁移到 templates 目录，并在原位置标记为 deprecated
 * 请优先使用 templates 目录下的新版本组件
 */

// DataTable - 已增强，保留原导出
export { DataTable } from "./DataTable";
export type { DataTableProps, DataTableRow, ExpandedRowRender } from "./DataTable";

// FormBuilder - 保留原导出
export { default as FormBuilder } from "./FormBuilder";
export type { FormFieldConfig, FormBuilderConfig } from "./FormBuilder";

// ConfirmDialog - 已增强，保留原导出
export {
  default as ConfirmDialog,
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
} from "./ConfirmDialog";
export type { ConfirmDialogConfig } from "./ConfirmDialog";

// ToastNotification - 保留原导出
export {
  default as ToastNotification,
  ToastProvider,
  useToast,
} from "./ToastNotification";
export type { ToastOptions } from "./ToastNotification";

// PaginationComponent - 保留原导出
export { default as PaginationComponent } from "./Pagination";
export type { PaginationConfig } from "./Pagination";

// ProgressBar - 保留原导出
export { default as ProgressBar } from "./ProgressBar";
export type { ProgressBarProps } from "./ProgressBar";

// TreeView - 保留原导出
export { default as TreeView } from "./TreeView";
export type { TreeNode, TreeViewProps } from "./TreeView";

// Stepper - 保留原导出
export { default as Stepper } from "./Stepper";
export type { StepperProps, StepItem } from "./Stepper";

// HelpButton - 保留原导出
export { default as HelpButton } from "./HelpButton";
export type { HelpButtonProps } from "./HelpButton";

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as StatusBadge } from "./StatusBadge";
export type { StatusBadgeProps } from "./StatusBadge";

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as AlertCard } from "./AlertCard";
export type { AlertCardProps } from "./AlertCard";

/**
 * @deprecated 已合并到 templates/DashboardTemplate.tsx
 * 请使用 DashboardTemplate 组件中的 StatCard 类型
 * 该组件将在未来版本中移除
 */
export { default as StatCard } from "./StatCard";
export type { StatCardBaseProps, MetricCardProps, ChartCardProps } from "./StatCard";

// AmountDisplay - 保留原导出
export { default as AmountDisplay } from "./AmountDisplay";
export type { AmountDisplayProps } from "./AmountDisplay";

// DateRangePicker - 保留原导出
export { default as DateRangePicker } from "./DateRangePicker";
export type { DateRangePickerProps } from "./DateRangePicker";

// ImageUpload - 保留原导出
export { default as ImageUpload } from "./ImageUpload";
export type { ImageUploadProps } from "./ImageUpload";

// FileUpload - 保留原导出
export { default as FileUpload } from "./FileUpload";
export type { FileUploadProps } from "./FileUpload";

// DataExport - 保留原导出
export { default as DataExport } from "./DataExport";
export type { DataExportProps, ExportField, ExportFormat } from "./DataExport";

// QuickSearch - 保留原导出
export { default as QuickSearch } from "./QuickSearch";
export type {
  QuickSearchProps,
  SearchSuggestion,
  SearchHistoryItem,
} from "./QuickSearch";

// StatusTimeline - 保留原导出
export { default as StatusTimeline } from "./StatusTimeline";
export type { StatusTimelineProps, TimelineItem } from "./StatusTimeline";

// CommentList - 保留原导出
export { default as CommentList } from "./CommentList";
export type { CommentListProps, Comment } from "./CommentList";

// UserSelect - 保留原导出
export { default as UserSelect } from "./UserSelect";
export type { UserSelectProps, User } from "./UserSelect";

// DepartmentSelect - 保留原导出
export { default as DepartmentSelect } from "./DepartmentSelect";
export type { DepartmentSelectProps, Department } from "./DepartmentSelect";

// Grid - Grid2 兼容组件
export { Grid } from "./Grid";
