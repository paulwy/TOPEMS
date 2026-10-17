/**
 * Extension templates (12, imported on demand).
 *
 * These can be composed from core templates + config, or are lower-frequency.
 * Dynamic import (lazy) is recommended to reduce bundle size.
 */
import { lazy } from 'react';

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

// Lazy GIS map template: leaflet stays out of first paint.
export const GisMapTemplate = lazy(() =>
  import('../GisMapTemplate').then((m) => ({ default: m.GisMapTemplate }))
);
export type {
  MapMarker,
  MapLayer,
  GeoFence,
  TrackPoint,
  GisMapTemplateProps,
} from '../GisMapTemplate';

export { MobilePageTemplate } from '../MobilePageTemplate';
export type { MobilePageTemplateProps } from '../MobilePageTemplate';

export { AuthPageTemplate } from '../AuthPageTemplate';
export type { AuthPageTemplateProps } from '../AuthPageTemplate';

export { ChatPageTemplate } from '../ChatPageTemplate';
export type { ChatPageTemplateProps } from '../ChatPageTemplate';

export { AiToolPageTemplate } from '../AiToolPageTemplate';
export type { AiToolPageTemplateProps } from '../AiToolPageTemplate';

export { DesignerTemplate } from '../DesignerTemplate';
export type { DesignerTemplateProps, DesignerMode } from '../DesignerTemplate';

export { ReportViewerTemplate } from '../ReportViewerTemplate';
export type { ReportViewerTemplateProps, ReportViewerMode } from '../ReportViewerTemplate';
