// Layout components
export { ModuleTabs } from './layout/ModuleTabs';
export { default as PageHeader } from './layout/PageHeader';
export type { PageHeaderProps, PageHeaderAction } from './layout/PageHeader';
export { default as PageBreadcrumb } from './layout/PageBreadcrumb';
export type { PageBreadcrumbProps } from './layout/PageBreadcrumb';
// BreadcrumbItem 在两个组件中都有定义，统一从 PageHeader 导出
export type { BreadcrumbItem } from './layout/PageHeader';
export { default as ServiceMonitor } from './layout/ServiceMonitor';
export { GlobalLayout } from './layout/GlobalLayout';

// ===== 统一导航组件 (规范版本) =====
// MobileNav - 移动端完整导航实现
export { MobileNav } from './layout/MobileNav';

// Sidebar - 侧边栏组件
export { Sidebar } from './layout/Sidebar';

// Common components
export { Grid } from './common/Grid';
export type { GridProps, GridSizeProps } from './common/Grid';

export { default as PageContainer } from './common/PageContainer';
export type { PageContainerProps } from './common/PageContainer';

export { default as BackButton } from './common/BackButton';
export type { BackButtonProps } from './common/BackButton';

export { default as TreeView } from './common/TreeView';
export type { TreeNode, TreeViewProps } from './common/TreeView';

export { default as ProgressBar } from './common/ProgressBar';
export type { ProgressBarProps } from './common/ProgressBar';

export { default as Stepper } from './common/Stepper';
export type { StepperProps, StepItem } from './common/Stepper';

export { default as HelpButton } from './common/HelpButton';
export type { HelpButtonProps } from './common/HelpButton';

// ===== 统一对话框/抽屉组件 =====
export { default as Dialog } from './common/Dialog';
export type { DialogProps } from './common/Dialog';
// DialogSize 在两个组件中都有定义，统一从 ConfirmDialog 导出
export type { DialogSize } from './common/ConfirmDialog';

export { default as Drawer } from './common/Drawer';
export type { DrawerProps, DrawerAnchor, DrawerVariant } from './common/Drawer';

export { default as ConfirmDialog } from './common/ConfirmDialog';
export type { ConfirmDialogConfig, DialogType, DialogButtonType } from './common/ConfirmDialog';

// ===== 统一表单组件 =====
// FormField - 统一 TextField 包装
export { default as FormField } from './common/FormField';
export type { FormFieldProps } from './common/FormField';

// FormSelect - 统一 Select 包装
export { default as FormSelect } from './common/FormSelect';
export type { FormSelectProps, FormSelectOption } from './common/FormSelect';

// ActionButton - 统一按钮组件
export { default as ActionButton } from './common/ActionButton';
export type { ActionButtonProps, ActionButtonVariant, ActionButtonSize } from './common/ActionButton';

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

// ===== 统一通知系统 =====
export { NotificationProvider } from './notification/NotificationProvider';

// MUI enhanced components
export { EmptyState } from './mui/EmptyState';
export type { EmptyStateProps } from './mui/EmptyState';

export { LoadingState, InlineLoading, ButtonLoading } from './mui/LoadingState';
export type { LoadingStateProps } from './mui/LoadingState';

export { FilterBar } from './mui/FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './mui/FilterBar';

export { ActionBar, QuickActionBar } from './mui/ActionBar';
export type { Action, ActionBarProps, QuickActionBarProps } from './mui/ActionBar';

// ===== 页面模板组件 (统一使用 templates/ 目录) =====
export { ListPageTemplate } from './templates/ListPageTemplate';
export type {
  ColumnDef,
  RowAction,
  BatchAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
} from './templates/ListPageTemplate';

export { DetailPageTemplate } from './templates/DetailPageTemplate';
export type {
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
} from './templates/DetailPageTemplate';

export { FormPageTemplate } from './templates/FormPageTemplate';
export type {
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from './templates/FormPageTemplate';

export { DashboardTemplate } from './templates/DashboardTemplate';
export type {
  StatCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from './templates/DashboardTemplate';

export { TreePageTemplate } from './templates/TreePageTemplate';
export { CardListTemplate } from './templates/CardListTemplate';
export { StatsPageTemplate } from './templates/StatsPageTemplate';
export { WizardPageTemplate } from './templates/WizardPageTemplate';
export { KanbanPageTemplate } from './templates/KanbanPageTemplate';
export { TimelinePageTemplate } from './templates/TimelinePageTemplate';
export { SettingsPageTemplate } from './templates/SettingsPageTemplate';
export { MarkdownEditorTemplate } from './templates/MarkdownEditorTemplate';
export { ReportDesignerTemplate } from './templates/ReportDesignerTemplate';
export { GisMapTemplate } from './templates/GisMapTemplate';

// BI 组件
export { ChartCard } from './bi/ChartCard';
export { MetricCard } from './bi/MetricCard';
export type { MetricCardProps } from './bi/MetricCard';
export { StatsChart } from './bi/StatsChart';
export type { StatsChartProps } from './bi/StatsChart';
export { ChartAnnotations } from './bi/ChartAnnotations';
export { ChartExport } from './bi/ChartExport';
export { ChartLinkerProvider } from './bi/ChartLinker';
export { useChartLinker } from './bi/ChartLinker';
export { DrillDownPanel } from './bi/DrillDownPanel';
export { FullscreenChart } from './bi/FullscreenChart';
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
