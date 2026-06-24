// Layout components
export { TopNav } from './layout/TopNav';
export { ModuleTabs } from './layout/ModuleTabs';
export { default as PageHeader } from './layout/PageHeader';
export type { PageHeaderProps, PageHeaderAction } from './layout/PageHeader';
export { default as PageBreadcrumb } from './layout/PageBreadcrumb';
export type { PageBreadcrumbProps, BreadcrumbItem } from './layout/PageBreadcrumb';
export { default as ServiceMonitor } from './layout/ServiceMonitor';
export { GlobalLayout } from './layout/GlobalLayout';

// ===== 统一导航组件 (规范版本) =====
// MobileNav - 移动端完整导航实现
export { MobileNav } from './layout/MobileNav';

// MobileHeader - 移动端顶部导航栏
export { default as MobileHeader } from './layout/MobileHeader';

// Sidebar - 侧边栏组件
export { Sidebar } from './layout/Sidebar';

// Common components
export { default as TreeView } from './common/TreeView';
export type { TreeNode, TreeViewProps } from './common/TreeView';

export { default as ProgressBar } from './common/ProgressBar';
export type { ProgressBarProps } from './common/ProgressBar';

export { default as Stepper } from './common/Stepper';
export type { StepperProps, StepItem } from './common/Stepper';

export { default as HelpButton } from './common/HelpButton';
export type { HelpButtonProps } from './common/HelpButton';

export { default as ConfirmDialog } from './common/ConfirmDialog';
export type { ConfirmDialogConfig } from './common/ConfirmDialog';

// ===== 统一状态组件 =====
// StatusBadge - 统一状态徽章组件 (common 版本最完整)
export {
  StatusBadge,
  EmployeeStatusBadge,
  AttendanceStatusBadge,
  LeaveStatusBadge,
  CustomerStatusBadge,
  OpportunityStatusBadge,
  ProjectStatusBadge,
  WorkflowStatusBadge,
  FinanceStatusBadge,
  ModuleStatusBadge,
  DEFAULT_STATUS_MAP,
} from './common/StatusBadge';
export type {
  StatusBadgeProps,
  StatusColor,
  StatusVariant,
  StatusSize,
  StatusConfig,
  StatusMapConfig,
} from './common/StatusBadge';

// ===== Toast 通知系统 (规范版本: ui/toast.tsx) =====
export { Toast } from './ui/toast';
export type { ToastProps, ToastActionElement } from './ui/toast';
export { ToastContainer } from './notification/Toast';
export { ToastProvider, useToast } from './common/ToastNotification';
export type { ToastOptions } from './common/ToastNotification';

// MUI enhanced components
export {
  EmptyState,
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
} from './mui/EmptyState';
export type { EmptyStateProps } from './mui/EmptyState';

export { LoadingState, InlineLoading, ButtonLoading } from './mui/LoadingState';
export type { LoadingStateProps } from './mui/LoadingState';

export { FilterBar } from './mui/FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './mui/FilterBar';

export { ActionBar, QuickActionBar } from './mui/ActionBar';
export type { Action, ActionBarProps, QuickActionBarProps } from './mui/ActionBar';

// BI 组件
export { ChartCard } from './bi/ChartCard';
// BISkeleton 默认导出是一个对象，包含多个 skeleton 组件
export { default as BISkeleton } from './bi/BISkeleton';
export {
  MetricCardSkeleton,
  ChartCardSkeleton,
  ModuleCardSkeleton,
  VisualizationCardSkeleton,
  ActivityItemSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  AnalyticsSkeleton,
  VisualizationSkeleton,
} from './bi/BISkeleton';

// 导出组件
export { default as ExportModal } from './export/ExportModal';
export { default as ExportButton } from './export/ExportButton';

// 认证组件
export { LoginFormV2 } from './auth/LoginFormV2';

// 权限验证组件
export {
  withPermission,
  RequirePermission,
  PermissionGuard,
  ModulePermissionGuard,
  ConditionalRender,
} from './PermissionComponents';
export type {
  WithPermissionOptions,
  RequirePermissionProps,
  PermissionGuardProps,
  ModulePermissionGuardProps,
  ConditionalRenderProps,
} from './PermissionComponents';

// ===== 访问日志组件 =====
export {
  AccessLogger,
  useAccessLogger,
  PageAccessLogger,
  ActionLogger,
} from './AccessLogger';
export type { AccessLogEntry } from './AccessLogger';
