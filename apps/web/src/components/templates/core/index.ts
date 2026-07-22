/**
 * 核心模板（5个，覆盖 80% 场景）
 *
 * 1. ListPageTemplate   - 列表页（最常用，含表格/卡片/树形扩展）
 * 2. FormPageTemplate   - 表单页（含分步向导扩展）
 * 3. DetailPageTemplate - 详情页（含主从详情扩展）
 * 4. DashboardTemplate  - 仪表盘（含统计分析扩展）
 * 5. KanbanPageTemplate - 看板页（任务/状态流转）
 */

export { ListPageTemplate } from '../ListPageTemplate';
export type {
  ColumnDef,
  FilterConfig,
  FilterOption,
  RowAction,
  BatchAction,
  ListPageTemplateProps,
  ExpandedRowRenderProps,
  ColumnConfig,
} from '../ListPageTemplate';

export { FormPageTemplate } from '../FormPageTemplate';
export type {
  FormField,
  FormSection,
  FormPageTemplateProps,
  FieldDependency,
  ValidationToast,
} from '../FormPageTemplate';

export { DetailPageTemplate } from '../DetailPageTemplate';
export type {
  TabConfig,
  SectionConfig,
  DetailField,
  DetailPageTemplateProps,
} from '../DetailPageTemplate';

export { DashboardTemplate } from '../DashboardTemplate';
export type {
  StatCard,
  ChartCard,
  RecentItem,
  QuickAction,
  DashboardTemplateProps,
} from '../DashboardTemplate';

export { KanbanPageTemplate } from '../KanbanPageTemplate';
export type {
  KanbanCard,
  KanbanColumn,
  KanbanAction,
  KanbanStats,
  KanbanPageTemplateProps,
} from '../KanbanPageTemplate';
