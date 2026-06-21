// 页面模板组件
// 用于统一页面布局和样式

export { PageHeader } from "./PageHeader";
export type { BreadcrumbItem, PageAction, PageHeaderProps } from "./PageHeader";

export { ListPageTemplate } from "./ListPageTemplate";
export type {
  ColumnDef,
  FilterConfig,
  FilterOption,
  RowAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
} from "./ListPageTemplate";

export { DetailPageTemplate } from "./DetailPageTemplate";
export type {
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
} from "./DetailPageTemplate";

export { FormPageTemplate } from "./FormPageTemplate";
export type {
  FormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from "./FormPageTemplate";

export { DashboardTemplate } from "./DashboardTemplate";
export type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from "./DashboardTemplate";

export { EmptyState } from "./EmptyState";
export type {
  EmptyStateProps,
  EmptyStateAction,
  EmptyStateType,
} from "./EmptyState";
export {
  NoDataEmptyState,
  SearchEmptyState,
  FilterEmptyState,
  FolderEmptyState,
  ErrorEmptyState,
} from "./EmptyState";

export { TreePageTemplate } from "./TreePageTemplate";
export type {
  TreeNode,
  TreeConfig,
  StatCard as TreeStatCard,
  TreeAction,
  TreePageTemplateProps,
} from "./TreePageTemplate";

export { CardListTemplate } from "./CardListTemplate";
export type {
  MetricStatCard,
  FilterConfig as CardFilterConfig,
  CardAction,
  CardRenderConfig,
  CardListTemplateProps,
} from "./CardListTemplate";

export { StatsPageTemplate } from "./StatsPageTemplate";
export type {
  StatCard as StatsStatCard,
  ChartData,
  ChartConfig,
  TableColumn,
  DataTable,
  TimeRangeOption,
  TabItem,
  StatsPageTemplateProps,
} from "./StatsPageTemplate";

export { default as TemplateDemoPage } from "./TemplateDemoPage";
