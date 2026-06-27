// Layout components
export { GlobalLayout } from './layout/GlobalLayout';
export { ModuleTabs } from './layout/ModuleTabs';
export type { TabItem } from './layout/ModuleTabs';
export { default as PageHeader } from './templates/PageHeader';
export type {
  PageHeaderProps,
  PageAction,
  PathTabItem,
  BreadcrumbItem,
} from './templates/PageHeader';
export type { PageAction as PageHeaderAction } from './templates/PageHeader';
export { default as ServiceMonitor } from './layout/ServiceMonitor';

// ===== 统一导航组件 (规范版本) =====
export { MobileNav } from './layout/MobileNav';
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

export {
  default as ConfirmDialog,
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
} from './common/ConfirmDialog';
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
export type {
  ActionButtonProps,
  ActionButtonVariant,
  ActionButtonSize,
} from './common/ActionButton';

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

// ===== 数据展示组件 =====
export { DataTable } from './common/DataTable';
export type {
  DataTableProps,
  DataTableRow,
  ExpandedRowRender,
  AdvancedFilter as DataTableAdvancedFilter,
} from './common/DataTable';

export { default as PaginationComponent } from './common/Pagination';
export type { PaginationConfig } from './common/Pagination';

export { default as LoadingSpinner } from './common/LoadingSpinner';

export { default as StatusTimeline } from './common/StatusTimeline';
export type { StatusTimelineProps, TimelineItem } from './common/StatusTimeline';

// ===== 表单构建器 =====
export { default as FormBuilder } from './common/FormBuilder';
export type { FormFieldConfig, FormBuilderConfig } from './common/FormBuilder';

// ===== 高级筛选 =====
export { default as AdvancedFilterPanel } from './common/AdvancedFilter';
export type {
  AdvancedFilterProps,
  FilterCondition as AdvancedFilterCondition,
} from './common/AdvancedFilter';

// ===== 数据展示辅助组件 =====
export { default as AmountDisplay } from './common/AmountDisplay';
export type { AmountDisplayProps } from './common/AmountDisplay';

export { default as RelativeTime } from './common/RelativeTime';
export type { RelativeTimeProps } from './common/RelativeTime';

// ===== 日期选择组件 =====
export { default as DateRangePicker } from './common/DateRangePicker';
export type { DateRangePickerProps } from './common/DateRangePicker';

export { default as DateRangeQuickSelect } from './common/DateRangeQuickSelect';
export type { DateRangeQuickSelectProps, DateRange } from './common/DateRangeQuickSelect';

// ===== 文件上传组件 =====
export { default as FileUpload } from './common/FileUpload';
export type { FileUploadProps } from './common/FileUpload';

export { default as ImageUpload } from './common/ImageUpload';
export type { ImageUploadProps } from './common/ImageUpload';

// ===== 数据导出组件 =====
export { default as DataExport } from './common/DataExport';
export type { DataExportProps, ExportField, ExportFormat } from './common/DataExport';

// ===== 搜索组件 =====
export { default as QuickSearch } from './common/QuickSearch';
export type { QuickSearchProps, SearchSuggestion, SearchHistoryItem } from './common/QuickSearch';

// ===== 评论组件 =====
export { default as CommentList } from './common/CommentList';
export type { CommentListProps, Comment } from './common/CommentList';

// ===== 用户/部门选择组件 =====
export { default as UserSelect } from './common/UserSelect';
export type { UserSelectProps, User } from './common/UserSelect';

export { default as DepartmentSelect } from './common/DepartmentSelect';
export type { DepartmentSelectProps, Department } from './common/DepartmentSelect';

// ===== 统一通知系统 =====
export { NotificationProvider } from './notification/NotificationProvider';

// MUI enhanced components (已迁移到 common/ 目录)
export {
  EmptyState,
  ListEmptyState,
  SearchEmptyState,
  PermissionEmptyState,
  ErrorEmptyState,
} from './common/EmptyState';
export type { EmptyStateProps, ErrorEmptyStateProps } from './common/EmptyState';

export { FilterBar } from './common/FilterBar';
export type { FilterOption, FilterConfig, FilterBarProps } from './common/FilterBar';

export { StatCard as MuiStatCard, StatCardGroup } from './common/MuiStatCard';
export type { StatCardProps as MuiStatCardProps, StatCardGroupProps } from './common/MuiStatCard';

// ===== 页面模板组件 (统一使用 templates/ 目录) =====
export { ListPageTemplate } from './templates/ListPageTemplate';
export type {
  ColumnDef,
  FilterConfig as ListFilterConfig,
  FilterOption as ListFilterOption,
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
  FormField as FormPageFormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from './templates/FormPageTemplate';

export { DashboardTemplate } from './templates/DashboardTemplate';
export type {
  StatCard,
  ChartCard as DashboardChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from './templates/DashboardTemplate';

export { TreePageTemplate } from './templates/TreePageTemplate';
export type {
  TreeNode as TreePageTreeNode,
  TreeConfig,
  StatCard as TreeStatCard,
  TreeAction,
  TreePageTemplateProps,
} from './templates/TreePageTemplate';

export { CardListTemplate } from './templates/CardListTemplate';
export type {
  MetricStatCard,
  FilterConfig as CardFilterConfig,
  CardAction,
  CardRenderConfig,
  CardListTemplateProps,
} from './templates/CardListTemplate';

export { StatsPageTemplate } from './templates/StatsPageTemplate';
export type {
  StatCard as StatsStatCard,
  ChartData,
  ChartConfig,
  TableColumn,
  DataTable as StatsDataTable,
  TimeRangeOption,
  TabItem as StatsTabItem,
  StatsPageTemplateProps,
} from './templates/StatsPageTemplate';

export { WizardPageTemplate } from './templates/WizardPageTemplate';
export type {
  WizardStep,
  WizardAction,
  WizardPageTemplateProps,
} from './templates/WizardPageTemplate';

export { KanbanPageTemplate } from './templates/KanbanPageTemplate';
export type {
  KanbanCard,
  KanbanColumn,
  KanbanAction,
  KanbanStats,
  KanbanPageTemplateProps,
} from './templates/KanbanPageTemplate';

export { TimelinePageTemplate } from './templates/TimelinePageTemplate';
export type {
  TimelineNode,
  TimelineGroup,
  TimelineAction,
  TimeRange,
  TimelinePageTemplateProps,
} from './templates/TimelinePageTemplate';

export { SettingsPageTemplate } from './templates/SettingsPageTemplate';
export type {
  SettingValueType,
  SettingOption,
  SettingField,
  SettingSection,
  SettingTab,
  SettingsPageTemplateProps,
} from './templates/SettingsPageTemplate';

export { MarkdownEditorTemplate } from './templates/MarkdownEditorTemplate';
export type {
  MarkdownVersion,
  MarkdownEditorToolbarAction,
  MarkdownEditorTemplateProps,
} from './templates/MarkdownEditorTemplate';

export { ReportDesignerTemplate } from './templates/ReportDesignerTemplate';
export type {
  DataSourceType,
  LayoutType,
  ChartType,
  FilterOperator,
  SortDirection,
  DataSourceField,
  DataSourceConfig,
  SelectedField,
  FilterCondition as ReportFilterCondition,
  GroupByConfig,
  ReportChartConfig,
  LayoutConfig,
  ReportDesignerTemplateProps,
  ReportDesignerState,
} from './templates/ReportDesignerTemplate';

export { GisMapTemplate } from './templates/GisMapTemplate';
export type {
  MapMarker,
  MapLayer,
  GeoFence,
  TrackPoint,
  GisMapTemplateProps,
} from './templates/GisMapTemplate';

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
export { AccessLogger, useAccessLogger, PageAccessLogger, ActionLogger } from './AccessLogger';
export type { AccessLogEntry } from './AccessLogger';
