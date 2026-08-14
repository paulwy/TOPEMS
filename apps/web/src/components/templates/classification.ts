import i18n from '@/i18n';
export type PageTemplateType =
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'form'
  | 'tree'
  | 'stats'
  | 'settings'
  | 'kanban'
  | 'card-list'
  | 'wizard'
  | 'timeline'
  | 'master-detail'
  | 'markdown-editor'
  | 'report-designer'
  | 'gis-map';

export interface TemplateClassification {
  type: PageTemplateType;
  name: string;
  category: 'overview' | 'data-display' | 'data-entry' | 'analytics' | 'special';
  useCases: string[];
  component: string;
  propsType: string;
  frequency: 'high' | 'medium' | 'low';
  /**
   * 是否为核心模板（5 个核心模板之一）。
   * - true: 属于 CORE_TEMPLATES，覆盖 80% 场景，建议默认使用
   * - false: 属于 EXTENSION_TEMPLATES，按需引入
   */
  isCore: boolean;
}

export const TEMPLATE_CLASSIFICATIONS: TemplateClassification[] = [
  {
    type: 'list',
    name: i18n.t('components.classification.k0'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k3'), i18n.t('components.classification.crud_0'), i18n.t('components.classification.k2'), i18n.t('components.classification.k1')],
    component: 'ListPageTemplate',
    propsType: 'ListPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'detail',
    name: i18n.t('components.classification.k4'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k8'), i18n.t('components.classification.k7'), i18n.t('components.classification.k6'), i18n.t('components.classification.k5')],
    component: 'DetailPageTemplate',
    propsType: 'DetailPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'form',
    name: i18n.t('components.classification.k9'),
    category: 'data-entry',
    useCases: [i18n.t('components.classification.k13'), i18n.t('components.classification.k12'), i18n.t('components.classification.k11'), i18n.t('components.classification.k10')],
    component: 'FormPageTemplate',
    propsType: 'FormPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'dashboard',
    name: i18n.t('components.classification.k14'),
    category: 'overview',
    useCases: [i18n.t('components.classification.k18'), i18n.t('components.classification.k17'), i18n.t('components.classification.k16'), i18n.t('components.classification.k15')],
    component: 'DashboardTemplate',
    propsType: 'DashboardTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'tree',
    name: i18n.t('components.classification.k19'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k23'), i18n.t('components.classification.k22'), i18n.t('components.classification.k21'), i18n.t('components.classification.k20')],
    component: 'TreePageTemplate',
    propsType: 'TreePageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'stats',
    name: i18n.t('components.classification.k24'),
    category: 'analytics',
    useCases: [i18n.t('components.classification.k28'), i18n.t('components.classification.k27'), i18n.t('components.classification.k26'), i18n.t('components.classification.k25')],
    component: 'StatsPageTemplate',
    propsType: 'StatsPageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'settings',
    name: i18n.t('components.classification.k29'),
    category: 'data-entry',
    useCases: [i18n.t('components.classification.k33'), i18n.t('components.classification.k32'), i18n.t('components.classification.k31'), i18n.t('components.classification.k30')],
    component: 'SettingsPageTemplate',
    propsType: 'SettingsPageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'kanban',
    name: i18n.t('components.classification.k34'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k38'), i18n.t('components.classification.k37'), i18n.t('components.classification.k36'), i18n.t('components.classification.k35')],
    component: 'KanbanPageTemplate',
    propsType: 'KanbanPageTemplateProps',
    frequency: 'medium',
    isCore: true,
  },
  {
    type: 'card-list',
    name: i18n.t('components.classification.k39'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k43'), i18n.t('components.classification.k42'), i18n.t('components.classification.k41'), i18n.t('components.classification.k40')],
    component: 'CardListTemplate',
    propsType: 'CardListTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'wizard',
    name: i18n.t('components.classification.k44'),
    category: 'data-entry',
    useCases: [i18n.t('components.classification.k48'), i18n.t('components.classification.k47'), i18n.t('components.classification.k46'), i18n.t('components.classification.k45')],
    component: 'WizardPageTemplate',
    propsType: 'WizardPageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'timeline',
    name: i18n.t('components.classification.k49'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k53'), i18n.t('components.classification.k52'), i18n.t('components.classification.k51'), i18n.t('components.classification.k50')],
    component: 'TimelinePageTemplate',
    propsType: 'TimelinePageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'master-detail',
    name: i18n.t('components.classification.k54'),
    category: 'data-display',
    useCases: [i18n.t('components.classification.k58'), i18n.t('components.classification.k57'), i18n.t('components.classification.k56'), i18n.t('components.classification.k55')],
    component: 'MasterDetailPageTemplate',
    propsType: 'MasterDetailPageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'markdown-editor',
    name: i18n.t('components.classification.markdown_1'),
    category: 'data-entry',
    useCases: [i18n.t('components.classification.k62'), i18n.t('components.classification.k61'), i18n.t('components.classification.k60'), i18n.t('components.classification.k59')],
    component: 'MarkdownEditorTemplate',
    propsType: 'MarkdownEditorTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'report-designer',
    name: i18n.t('components.classification.k63'),
    category: 'analytics',
    useCases: [i18n.t('components.classification.k67'), i18n.t('components.classification.k66'), i18n.t('components.classification.k65'), i18n.t('components.classification.k64')],
    component: 'ReportDesignerTemplate',
    propsType: 'ReportDesignerTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'gis-map',
    name: i18n.t('components.classification.gis_2'),
    category: 'special',
    useCases: [i18n.t('components.classification.k71'), i18n.t('components.classification.k70'), i18n.t('components.classification.k69'), i18n.t('components.classification.k68')],
    component: 'GisMapTemplate',
    propsType: 'GisMapTemplateProps',
    frequency: 'low',
    isCore: false,
  },
];

/**
 * 核心模板（5 个，覆盖 80% 场景）
 *
 * - list    : 列表页（含表格/卡片/树形扩展）
 * - form    : 表单页（含分步向导扩展）
 * - detail  : 详情页（含主从详情扩展）
 * - dashboard: 仪表盘（含统计分析扩展）
 * - kanban  : 看板页（任务/状态流转）
 */
export const CORE_TEMPLATES: PageTemplateType[] = ['list', 'form', 'detail', 'dashboard', 'kanban'];

/**
 * 扩展模板（10 个，按需引入）
 *
 * 这些模板通过核心模板 + 配置组合可实现，或使用场景较低频。
 * 推荐使用动态导入（lazy import）以减少 bundle 体积。
 */
export const EXTENSION_TEMPLATES: PageTemplateType[] = [
  'tree',
  'stats',
  'settings',
  'wizard',
  'timeline',
  'card-list',
  'master-detail',
  'markdown-editor',
  'report-designer',
  'gis-map',
];

/**
 * 兼容别名：原 V22 的"核心 8 模板"
 *
 * 等价于新的 CORE_TEMPLATES（5 个）+ tree + stats + settings。
 * 保留以维持向后兼容，新代码建议使用 CORE_TEMPLATES 或 EXTENSION_TEMPLATES。
 */
export const CORE_8_TEMPLATES: PageTemplateType[] = [
  'dashboard',
  'list',
  'detail',
  'form',
  'tree',
  'stats',
  'settings',
  'kanban',
];

export function getTemplateByType(type: PageTemplateType): TemplateClassification | undefined {
  return TEMPLATE_CLASSIFICATIONS.find((t) => t.type === type);
}

export function getTemplatesByCategory(
  category: TemplateClassification['category']
): TemplateClassification[] {
  return TEMPLATE_CLASSIFICATIONS.filter((t) => t.category === category);
}

export function getHighFrequencyTemplates(): TemplateClassification[] {
  return TEMPLATE_CLASSIFICATIONS.filter((t) => t.frequency === 'high');
}

/**
 * 根据数据类型推荐合适的页面模板。
 *
 * 优先推荐核心模板（CORE_TEMPLATES）：
 * - tree  → list      （ListPageTemplate 含树形扩展，可承载层级数据）
 * - chart → dashboard （DashboardTemplate 含 ChartCard，可承载统计分析）
 * - settings 仍使用扩展模板 SettingsPageTemplate（无核心模板可替代）
 */
export function recommendTemplate(
  dataType: 'list' | 'detail' | 'form' | 'dashboard' | 'tree' | 'chart' | 'settings'
): PageTemplateType {
  const mapping: Record<string, PageTemplateType> = {
    list: 'list',
    detail: 'detail',
    form: 'form',
    dashboard: 'dashboard',
    tree: 'list',
    chart: 'dashboard',
    settings: 'settings',
  };
  return mapping[dataType] || 'list';
}
