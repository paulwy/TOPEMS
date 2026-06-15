// Layout components
export { TopNav } from "./layout/TopNav";
export { ModuleTabs } from "./layout/ModuleTabs";
export { default as PageHeader } from "./layout/PageHeader";
export type { PageHeaderProps, PageHeaderAction } from "./layout/PageHeader";
export { default as PageBreadcrumb } from "./layout/PageBreadcrumb";
export type {
  PageBreadcrumbProps,
  BreadcrumbItem,
} from "./layout/PageBreadcrumb";
export { default as ServiceMonitor } from "./layout/ServiceMonitor";
export { GlobalLayout } from "./layout/GlobalLayout";

// Common components
export { default as TreeView } from "./common/TreeView";
export type { TreeNode, TreeViewProps } from "./common/TreeView";

export { default as ProgressBar } from "./common/ProgressBar";
export type { ProgressBarProps } from "./common/ProgressBar";

export { default as Stepper } from "./common/Stepper";
export type { StepperProps, StepItem } from "./common/Stepper";

export { default as HelpButton } from "./common/HelpButton";
export type { HelpButtonProps } from "./common/HelpButton";

export { default as ConfirmDialog } from "./common/ConfirmDialog";
export type { ConfirmDialogConfig } from "./common/ConfirmDialog";

export { default as NotificationToast } from "./common/ToastNotification";
export { ToastProvider, useToast } from "./common/ToastNotification";
export type { ToastOptions } from "./common/ToastNotification";

// MUI enhanced components
export {
  EmptyState,
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
} from "./mui/EmptyState";
export type { EmptyStateProps } from "./mui/EmptyState";

export { LoadingState, InlineLoading, ButtonLoading } from "./mui/LoadingState";
export type { LoadingStateProps } from "./mui/LoadingState";

export { FilterBar } from "./mui/FilterBar";
export type {
  FilterOption,
  FilterConfig,
  FilterBarProps,
} from "./mui/FilterBar";

export { ActionBar, QuickActionBar } from "./mui/ActionBar";
export type {
  Action,
  ActionBarProps,
  QuickActionBarProps,
} from "./mui/ActionBar";

// Dashboard components
export {
  DashboardSection,
  TodayOverviewSection,
  QuickAccessSection,
  TodoListSection,
  ModuleNavigationSection,
  ServiceMonitorSection,
  RecentActivitySection,
} from "./dashboard/DashboardSections";
export type { DashboardSectionProps } from "./dashboard/DashboardSections";

export { StatusBadge } from "./dashboard/StatusBadge";
export type { ModuleStatus } from "./dashboard/StatusBadge";

// Responsive components
export { ResponsiveHeader } from "./responsive/ResponsiveHeader";
