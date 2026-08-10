export type AICopilotSource =
  | 'fab'
  | 'shortcut'
  | 'selection'
  | 'dashboard'
  | 'global-action'
  | 'mobile-nav';

export type AICopilotIntent =
  | 'chat'
  | 'explain'
  | 'summarize'
  | 'rewrite'
  | 'todo'
  | 'recommendation';

export interface AICopilotContext {
  pathname: string;
  moduleCode: string;
  breadcrumbs: string[];
  source: AICopilotSource;
  intent?: AICopilotIntent;
  selectedText?: string;
  query?: string;
  recommendationId?: string;
  createdAt: string;
}

export interface AICopilotContextInput {
  pathname?: string;
  source: AICopilotSource;
  intent?: AICopilotIntent;
  selectedText?: string;
  query?: string;
  recommendationId?: string;
  breadcrumbs?: string[];
  moduleCode?: string;
}

export const AI_COPILOT_CONTEXT_KEY = 'ai-copilot-context';

const moduleLabelMap: Record<string, string> = {
  dashboard: '首页',
  ai: 'AI助手',
  admin: '系统管理',
  asset: '资产',
  bi: '数据分析',
  crm: '客户',
  doc: '文档',
  erp: 'ERP',
  finance: '财务',
  gis: 'GIS',
  hrm: '人事',
  im: '协同',
  lims: '实验室',
  lowcode: '低代码',
  mes: '生产',
  mobile: '移动端',
  monitor: '监控',
  oa: '办公',
  pdm: '研发',
  plugin: '插件',
  pm: '项目',
  rd: '研发',
  scm: '供应链',
  srm: '供应商',
  ticket: '工单',
  wms: '仓储',
  workflow: '流程',
};

export function getModuleFromPath(pathname: string): string {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  if (!firstSegment) return 'dashboard';

  const moduleMap: Record<string, string> = {
    flow: 'workflow',
    assets: 'asset',
    equipment: 'asset',
    pdm: 'rd',
  };

  return moduleMap[firstSegment] || firstSegment;
}

export function getBreadcrumbsFromPath(pathname: string): string[] {
  const moduleCode = getModuleFromPath(pathname);
  const label = moduleLabelMap[moduleCode] || moduleCode.toUpperCase();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return [label];

  const leaf = segments[segments.length - 1]
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return leaf && leaf !== label ? [label, leaf] : [label];
}

export function buildAICopilotContext(input: AICopilotContextInput): AICopilotContext {
  const pathname =
    input.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/') || '/';
  const moduleCode = input.moduleCode || getModuleFromPath(pathname);

  return {
    pathname,
    moduleCode,
    breadcrumbs: input.breadcrumbs || getBreadcrumbsFromPath(pathname),
    source: input.source,
    intent: input.intent,
    selectedText: input.selectedText,
    query: input.query,
    recommendationId: input.recommendationId,
    createdAt: new Date().toISOString(),
  };
}

export function writeAICopilotContext(input: AICopilotContextInput): AICopilotContext {
  const context = buildAICopilotContext(input);

  try {
    window.localStorage.setItem(AI_COPILOT_CONTEXT_KEY, JSON.stringify(context));
  } catch {
    // localStorage 在隐私模式或测试环境中可能不可用，入口跳转不应被阻断。
  }

  return context;
}

export function readAICopilotContext(): AICopilotContext | null {
  try {
    const raw = window.localStorage.getItem(AI_COPILOT_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as AICopilotContext) : null;
  } catch {
    return null;
  }
}
