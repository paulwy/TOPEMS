// Layout components
import { lazy } from 'react';
// [cleaned] GlobalLayout - old desktop shell, replaced by GlobalLayoutV3 (UI V3 final 2026-10-16)
export { default as PageHeader } from './templates/PageHeader';
export type {
  PageHeaderProps,
  PageAction,
  PathTabItem,
  BreadcrumbItem,
} from './templates/PageHeader';
export type { PageAction as PageHeaderAction } from './templates/PageHeader';
// [已清理] ServiceMonitor - 0 引用（审计 P2-9）

// ===== 统一导航组件 (规范版本) =====
export { MobileNav } from './layout/MobileNav';
// [已清理] Sidebar - 0 引用（审计 P1-6，死代码删除）

// Common components
export { Grid } from './common/Grid';

// PageContainer - 使用 web 增强版本
export { PageContainer } from './common/PageContainer';

// [shared] BackButton - 已提升到 @topems/shared-components
export { BackButton } from '@topems/shared-components';

export { default as TreeView } from './common/TreeView';
export type { TreeNode } from './common/TreeView';

// [shared] ProgressBar - 已提升到 @topems/shared-components
export { ProgressBar, type ProgressBarProps } from '@topems/shared-components';

// [shared] Stepper - 已提升到 @topems/shared-components
export { Stepper, type StepperProps, type StepItem } from '@topems/shared-components';

export { default as HelpButton } from './common/HelpButton';

// ===== 统一对话框/抽屉组件 =====
export { default as Dialog } from './common/Dialog';
export type { DialogSize } from './common/Dialog';

export { default as Drawer } from './common/Drawer';
export type { DrawerAnchor } from './common/Drawer';

// [shared] ConfirmDialog - 已提升到 @topems/shared-components
export {
  ConfirmDialog,
  AlertDialog,
  InfoDialog,
  SuccessDialog,
  WarningDialog,
  ErrorDialog,
  ConfirmationDialog,
} from '@topems/shared-components';
export type { ConfirmDialogConfig, DialogType, DialogButtonType } from '@topems/shared-components';

// ===== 统一表单组件 =====
// [shared] FormField - 已提升到 @topems/shared-components
export { FormField, type FormFieldProps } from '@topems/shared-components';

// [shared] FormSelect - 已提升到 @topems/shared-components
export { FormSelect } from '@topems/shared-components';

// [shared] ActionButton - 已提升到 @topems/shared-components
export {
  ActionButton,
  type ActionButtonProps,
  type ActionButtonVariant,
  type ActionButtonSize,
} from '@topems/shared-components';

// [shared] StatusBadge - 已提升到 @topems/shared-components
export {
  StatusBadge,
  AttendanceStatusBadge,
  LeaveStatusBadge,
  ModuleStatusBadge,
  type StatusBadgeProps,
  type StatusColor,
  type StatusVariant,
  type StatusSize,
  type StatusConfig,
  type StatusMapConfig,
} from '@topems/shared-components';

// ===== 数据展示组件 =====
export { DataTable } from './common/DataTable';
export type {
  DataTableProps,
  DataTableRow,
  ExpandedRowRender,
  AdvancedFilter as DataTableAdvancedFilter,
} from './common/DataTable';

// [shared] PaginationComponent - 已提升到 @topems/shared-components
export {
  Pagination as PaginationComponent,
  type PaginationConfig,
} from '@topems/shared-components';

// [shared] LoadingSpinner - 已提升到 @topems/shared-components
export { LoadingSpinner } from '@topems/shared-components';

// [已清理] StatusTimeline - 0 引用（审计 P2-9）

// ===== 表单构建器 =====
// [已清理] FormBuilder - 0 引用（审计 P2-9）

// ===== 高级筛选 =====
// [已清理] AdvancedFilterPanel - 0 引用（审计 P2-9）

// ===== 数据展示辅助组件 =====
// [已清理] AmountDisplay - 0 引用（审计 P2-9）

// [shared] RelativeTime - 已提升到 @topems/shared-components
export { RelativeTime, type RelativeTimeProps } from '@topems/shared-components';

// ===== 日期选择组件 =====
export { default as DateRangePicker } from './common/DateRangePicker';

export { default as DateRangeQuickSelect } from './common/DateRangeQuickSelect';
export type { DateRange } from './common/DateRangeQuickSelect';

// ===== 文件上传组件 =====
export { default as FileUpload } from './common/FileUpload';

export { default as ImageUpload } from './common/ImageUpload';

// ===== 数据导出组件 =====
// [已清理] DataExport - 0 引用（通过 @/components/common 直接导入，审计 P2-9）

// ===== 搜索组件 =====
// [已清理] QuickSearch - 0 引用（通过 @/components/common 直接导入，审计 P2-9）

// ===== 评论组件 =====
// [已清理] CommentList - 0 引用（审计 P2-9）

// ===== 用户/部门选择组件 =====
// [shared] UserSelect - 已提升到 @topems/shared-components
export { UserSelect, type UserSelectProps } from '@topems/shared-components';
export type { User } from '@topems/shared-types';

// [已清理] DepartmentSelect - 0 引用（审计 P2-9）

// ===== 统一通知系统 =====
export { NotificationProvider } from './notification/NotificationProvider';

export { EmptyState } from '@topems/shared-components';

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

export { DashboardTemplate, DashboardPage } from './templates/DashboardTemplate';
export type {
  StatCard,
  ChartCard as DashboardChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
  DashboardPageProps,
  StatCardConfig,
  ChartConfig as DashboardChartConfig,
  DataTableConfig,
  DashboardColor,
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

// Lazy GIS map template: leaflet stays out of first paint.
export const GisMapTemplate = lazy(() =>
  import('./templates/GisMapTemplate').then((m) => ({ default: m.GisMapTemplate }))
);
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
export { StatsChart } from './bi/StatsChart';
export type { StatsChartProps } from './bi/StatsChart';

// BISkeleton 默认导出是一个对象，包含多个 skeleton 组件

// 导出组件
export { default as ExportModal } from './export/ExportModal';
export { default as ExportButton } from './export/ExportButton';

// 认证组件（登录表单由 pages/shared/LoginPage 自实现，LoginFormV2 已废弃删除）

// 权限验证组件

export type {} from './PermissionComponents';

// ===== 访问日志组件 =====

// ===== V51.0 Design System [已弃用] =====
// V51 设计系统已被 MUI 主题 + shared-components 体系替代。
// 禁止新代码从 @/components 或 @/design-system 引入 V51* 组件/令牌。
// 业务代码统一使用：
//   - 组件：@mui/material + @/components/common/* + @topems/shared-components
//   - 主题：theme/*.ts 中的 MUI ThemeProvider + createTheme
//   - 令牌：@topems/tokens
// 现存 12 处 V51 引用仅限 AI/Dev 内部面板，将在 Phase 2+ 分批迁移。
