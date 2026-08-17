import i18n from '@/i18n';

export type AICopilotSource =
  'fab' | 'shortcut' | 'selection' | 'dashboard' | 'global-action' | 'mobile-nav';

export type AICopilotIntent =
  'chat' | 'explain' | 'summarize' | 'rewrite' | 'todo' | 'recommendation';

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
  dashboard: i18n.t('shared.copilot_context.k0'),
  ai: i18n.t('shared.copilot_context.ai_0'),
  admin: i18n.t('shared.copilot_context.k1'),
  asset: i18n.t('shared.copilot_context.k2'),
  bi: i18n.t('shared.copilot_context.k3'),
  crm: i18n.t('shared.copilot_context.k4'),
  doc: i18n.t('shared.copilot_context.k5'),
  erp: 'ERP',
  finance: i18n.t('shared.copilot_context.k6'),
  gis: 'GIS',
  hrm: i18n.t('shared.copilot_context.k7'),
  im: i18n.t('shared.copilot_context.k8'),
  lims: i18n.t('shared.copilot_context.k9'),
  lowcode: i18n.t('shared.copilot_context.k10'),
  mes: i18n.t('shared.copilot_context.k11'),
  mobile: i18n.t('shared.copilot_context.k12'),
  monitor: i18n.t('shared.copilot_context.k13'),
  oa: i18n.t('shared.copilot_context.k14'),
  pdm: i18n.t('shared.copilot_context.k15'),
  plugin: i18n.t('shared.copilot_context.k16'),
  pm: i18n.t('shared.copilot_context.k17'),
  rd: i18n.t('shared.copilot_context.k18'),
  scm: i18n.t('shared.copilot_context.k19'),
  srm: i18n.t('shared.copilot_context.k20'),
  ticket: i18n.t('shared.copilot_context.k21'),
  wms: i18n.t('shared.copilot_context.k22'),
  workflow: i18n.t('shared.copilot_context.k23'),
};

export function getModuleFromPath(pathname: string): string {
  const firstSegment = pathname.split('/').find(Boolean);
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
