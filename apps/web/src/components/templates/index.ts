// 页面模板组件
// 用于统一页面布局和样式
// 核心8种模板：dashboard, list, detail, form, tree, stats, settings, kanban

export { PageHeader } from './PageHeader';
export type { BreadcrumbItem, PageAction, PageHeaderProps } from './PageHeader';

export { ListPageTemplate } from './ListPageTemplate';
export type {
  ColumnDef,
  FilterConfig,
  FilterOption,
  RowAction,
  BatchAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
} from './ListPageTemplate';

export { DetailPageTemplate } from './DetailPageTemplate';
export type {
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
} from './DetailPageTemplate';

export { FormPageTemplate } from './FormPageTemplate';
export type {
  FormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from './FormPageTemplate';

export { DashboardTemplate } from './DashboardTemplate';
export type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from './DashboardTemplate';

export { TreePageTemplate } from './TreePageTemplate';
export type {
  TreeNode,
  TreeConfig,
  StatCard as TreeStatCard,
  TreeAction,
  TreePageTemplateProps,
} from './TreePageTemplate';

export { CardListTemplate } from './CardListTemplate';
export type {
  MetricStatCard,
  FilterConfig as CardFilterConfig,
  CardAction,
  CardRenderConfig,
  CardListTemplateProps,
} from './CardListTemplate';

export { StatsPageTemplate } from './StatsPageTemplate';
export type {
  StatCard as StatsStatCard,
  ChartData,
  ChartConfig,
  TableColumn,
  DataTable,
  TimeRangeOption,
  TabItem,
  StatsPageTemplateProps,
} from './StatsPageTemplate';

export { WizardPageTemplate } from './WizardPageTemplate';
export type { WizardStep, WizardAction, WizardPageTemplateProps } from './WizardPageTemplate';

export { KanbanPageTemplate } from './KanbanPageTemplate';
export type {
  KanbanCard,
  KanbanColumn,
  KanbanAction,
  KanbanStats,
  KanbanPageTemplateProps,
} from './KanbanPageTemplate';

export { TimelinePageTemplate } from './TimelinePageTemplate';
export type {
  TimelineNode,
  TimelineGroup,
  TimelineAction,
  TimeRange,
  TimelinePageTemplateProps,
} from './TimelinePageTemplate';

export { SettingsPageTemplate } from './SettingsPageTemplate';
export type {
  SettingValueType,
  SettingOption,
  SettingField,
  SettingSection,
  SettingTab,
  SettingsPageTemplateProps,
} from './SettingsPageTemplate';

export { MarkdownEditorTemplate } from './MarkdownEditorTemplate';
export type {
  MarkdownVersion,
  MarkdownEditorToolbarAction,
  MarkdownEditorTemplateProps,
} from './MarkdownEditorTemplate';

export { default as TemplateDemoPage } from './TemplateDemoPage';

export { ReportDesignerTemplate } from './ReportDesignerTemplate';
export type {
  DataSourceType,
  LayoutType,
  ChartType,
  FilterOperator,
  SortDirection,
  DataSourceField,
  DataSourceConfig,
  SelectedField,
  FilterCondition,
  GroupByConfig,
  ReportChartConfig,
  LayoutConfig,
  ReportDesignerTemplateProps,
  ReportDesignerState,
} from './ReportDesignerTemplate';

export { GisMapTemplate } from './GisMapTemplate';
export type {
  MapMarker,
  MapLayer,
  GeoFence,
  TrackPoint,
  GisMapTemplateProps,
} from './GisMapTemplate';

export { MasterDetailPageTemplate } from './MasterDetailPageTemplate';
export type {
  MasterColumn,
  MasterRowAction,
  SortConfig as MasterSortConfig,
  PaginationConfig as MasterPaginationConfig,
  MasterDetailPageTemplateProps,
} from './MasterDetailPageTemplate';

export {
  TEMPLATE_CLASSIFICATIONS,
  CORE_8_TEMPLATES,
  getTemplateByType,
  getTemplatesByCategory,
  getHighFrequencyTemplates,
  recommendTemplate,
} from './classification';
export type { PageTemplateType, TemplateClassification } from './classification';
