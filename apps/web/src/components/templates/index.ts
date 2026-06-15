// 页面模板组件
// 用于统一页面布局和样式

export { PageHeader } from "./PageHeader";
export type { BreadcrumbItem, PageAction, PageHeaderProps } from "./PageHeader";

export { ListPageTemplate } from "./ListPageTemplate";
export type {
  ColumnDef,
  FilterConfig,
  RowAction,
  ListPageTemplateProps,
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
} from "./FormPageTemplate";

export { DashboardTemplate } from "./DashboardTemplate";
export type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from "./DashboardTemplate";

export { default as TemplateDemoPage } from "./TemplateDemoPage";
