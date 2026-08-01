/**
 * 扩展模板插件（10个，按需引入）
 *
 * 这些模板通过核心模板 + 配置组合可实现，或使用场景较低频。
 * 推荐使用动态导入（lazy import）以减少 bundle 体积。
 */

export { TreePageTemplate } from '../TreePageTemplate';
export type { TreeNode, TreeConfig, TreeAction, TreePageTemplateProps } from '../TreePageTemplate';

export { StatsPageTemplate } from '../StatsPageTemplate';
export type {
  ChartData,
  ChartConfig as StatsChartConfig,
  TableColumn,
  DataTable,
  TimeRangeOption,
  TabItem,
  StatsPageTemplateProps,
} from '../StatsPageTemplate';

export { SettingsPageTemplate } from '../SettingsPageTemplate';
export type {
  SettingValueType,
  SettingOption,
  SettingField,
  SettingSection,
  SettingTab,
  SettingsPageTemplateProps,
} from '../SettingsPageTemplate';

export { WizardPageTemplate } from '../WizardPageTemplate';
export type { WizardStep, WizardAction, WizardPageTemplateProps } from '../WizardPageTemplate';

export { TimelinePageTemplate } from '../TimelinePageTemplate';
export type {
  TimelineNode,
  TimelineGroup,
  TimelineAction,
  TimeRange,
  TimelinePageTemplateProps,
} from '../TimelinePageTemplate';

export { CardListTemplate } from '../CardListTemplate';
export type {
  MetricStatCard,
  CardAction,
  CardRenderConfig,
  CardListTemplateProps,
} from '../CardListTemplate';

export { MasterDetailPageTemplate } from '../MasterDetailPageTemplate';
export type {
  MasterColumn,
  MasterRowAction,
  MasterDetailPageTemplateProps,
} from '../MasterDetailPageTemplate';

export { MarkdownEditorTemplate } from '../MarkdownEditorTemplate';
export type {
  MarkdownVersion,
  MarkdownEditorToolbarAction,
  MarkdownEditorTemplateProps,
} from '../MarkdownEditorTemplate';

export { ReportDesignerTemplate } from '../ReportDesignerTemplate';
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
} from '../ReportDesignerTemplate';

export { GisMapTemplate } from '../GisMapTemplate';
export type {
  MapMarker,
  MapLayer,
  GeoFence,
  TrackPoint,
  GisMapTemplateProps,
} from '../GisMapTemplate';
