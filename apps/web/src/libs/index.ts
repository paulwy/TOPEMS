/**
 * 工具函数和Hooks统一导出
 */

export * from "../utils/format";
export * from "../utils/storage";
export * from "../utils/date";
export * from "../utils/string";
export * from "../utils/validator";

export * from "../hooks/useCommonHooks";
export * from "../hooks/useApiHooks";
export * from "../hooks/useUiState";

export { useCrud } from "../hooks/useCrud";
export type { UseCrudOptions, UseCrudResult } from "../hooks/useCrud";

export { useFormValidation } from "../hooks/useFormValidation";
export { usePermission } from "../hooks/usePermission";
export { useNotification } from "../hooks/useNotification";
export { useNotificationSettings } from "../hooks/useNotificationSettings";
export { useTopNav } from "../hooks/useTopNav";
export { useBatchSelection } from "../hooks/useBatchSelection";
export { useDataTable, useExportData } from "../hooks/useDataTable";
export { useImportExport } from "../hooks/useImportExport";
export { useResponsive } from "../hooks/useResponsive";
export type { Breakpoint } from "../hooks/useResponsive";
export { useToast } from "../hooks/use-toast";

// ============ 模板组件统一导出 ============
export {
  ListPageTemplate,
  DetailPageTemplate,
  FormPageTemplate,
  DashboardTemplate,
  TreePageTemplate,
  CardListTemplate,
  StatsPageTemplate,
  EmptyState,
  NoDataEmptyState,
  SearchEmptyState,
  FilterEmptyState,
  FolderEmptyState,
  ErrorEmptyState,
  PageHeader,
} from "@/components/templates";

export type {
  // ListPageTemplate
  ColumnDef,
  FilterConfig,
  FilterOption,
  RowAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
  // DetailPageTemplate
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
  // FormPageTemplate
  FormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
  // DashboardTemplate
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
  // TreePageTemplate
  TreeNode,
  TreeConfig,
  TreeAction,
  TreePageTemplateProps,
  // CardListTemplate
  MetricStatCard,
  CardAction,
  CardRenderConfig,
  CardListTemplateProps,
  // StatsPageTemplate
  ChartData,
  ChartConfig,
  TableColumn,
  DataTable,
  TimeRangeOption,
  TabItem,
  StatsPageTemplateProps,
  // EmptyState
  EmptyStateProps,
  EmptyStateAction,
  EmptyStateType,
  // PageHeader
  BreadcrumbItem,
  PageAction,
  PageHeaderProps,
} from "@/components/templates";
