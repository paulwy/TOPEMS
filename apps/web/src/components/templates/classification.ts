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
    name: '列表页模板',
    category: 'data-display',
    useCases: ['数据列表', 'CRUD管理', '查询结果', '审批列表'],
    component: 'ListPageTemplate',
    propsType: 'ListPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'detail',
    name: '详情页模板',
    category: 'data-display',
    useCases: ['详情查看', '信息展示', '数据详情', '记录查看'],
    component: 'DetailPageTemplate',
    propsType: 'DetailPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'form',
    name: '表单页模板',
    category: 'data-entry',
    useCases: ['新增数据', '编辑数据', '表单填写', '数据录入'],
    component: 'FormPageTemplate',
    propsType: 'FormPageTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'dashboard',
    name: '仪表盘模板',
    category: 'overview',
    useCases: ['模块首页', '数据概览', '管理驾驶舱', '统计看板'],
    component: 'DashboardTemplate',
    propsType: 'DashboardTemplateProps',
    frequency: 'high',
    isCore: true,
  },
  {
    type: 'tree',
    name: '树形页模板',
    category: 'data-display',
    useCases: ['组织架构', '分类管理', '层级数据', '目录结构'],
    component: 'TreePageTemplate',
    propsType: 'TreePageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'stats',
    name: '统计分析模板',
    category: 'analytics',
    useCases: ['数据报表', '统计分析', '趋势分析', '多维分析'],
    component: 'StatsPageTemplate',
    propsType: 'StatsPageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'settings',
    name: '设置页模板',
    category: 'data-entry',
    useCases: ['系统设置', '参数配置', '个人设置', '偏好设置'],
    component: 'SettingsPageTemplate',
    propsType: 'SettingsPageTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'kanban',
    name: '看板模板',
    category: 'data-display',
    useCases: ['任务看板', '状态流转', '进度跟踪', '工作流可视化'],
    component: 'KanbanPageTemplate',
    propsType: 'KanbanPageTemplateProps',
    frequency: 'medium',
    isCore: true,
  },
  {
    type: 'card-list',
    name: '卡片列表模板',
    category: 'data-display',
    useCases: ['产品展示', '项目列表', '客户卡片', '员工卡片'],
    component: 'CardListTemplate',
    propsType: 'CardListTemplateProps',
    frequency: 'medium',
    isCore: false,
  },
  {
    type: 'wizard',
    name: '向导页模板',
    category: 'data-entry',
    useCases: ['分步表单', '引导流程', '配置向导', '入职流程'],
    component: 'WizardPageTemplate',
    propsType: 'WizardPageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'timeline',
    name: '时间线模板',
    category: 'data-display',
    useCases: ['操作日志', '历史记录', '进度追踪', '事件时间线'],
    component: 'TimelinePageTemplate',
    propsType: 'TimelinePageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'master-detail',
    name: '主从详情模板',
    category: 'data-display',
    useCases: ['主从表', '关联数据', '订单明细', '员工详情'],
    component: 'MasterDetailPageTemplate',
    propsType: 'MasterDetailPageTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'markdown-editor',
    name: 'Markdown编辑器模板',
    category: 'data-entry',
    useCases: ['文档编辑', '知识库', '公告编辑', '内容管理'],
    component: 'MarkdownEditorTemplate',
    propsType: 'MarkdownEditorTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'report-designer',
    name: '报表设计器模板',
    category: 'analytics',
    useCases: ['自定义报表', '数据透视', '报表配置', '数据源管理'],
    component: 'ReportDesignerTemplate',
    propsType: 'ReportDesignerTemplateProps',
    frequency: 'low',
    isCore: false,
  },
  {
    type: 'gis-map',
    name: 'GIS地图模板',
    category: 'special',
    useCases: ['地理信息', '设备定位', '区域管理', '轨迹追踪'],
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
export const CORE_TEMPLATES: PageTemplateType[] = [
  'list',
  'form',
  'detail',
  'dashboard',
  'kanban',
];

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
