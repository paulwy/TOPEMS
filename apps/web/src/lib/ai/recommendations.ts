import { AI_PATHS } from '@/modules/ai/config';
import { BI_PATHS } from '@/modules/bi/config';
import { CRM_PATHS } from '@/modules/crm/config';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { HRM_PATHS } from '@/modules/hrm/config';
import { PM_PATHS } from '@/modules/pm/config';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import type { AICopilotContext } from './copilotContext';
import i18n from '@/i18n';

export interface AIRecommendation {
  id: string;
  label: string;
  description: string;
  action: string;
  icon?: string;
  moduleCode?: string;
}

export interface QuickCommand {
  command: string;
  label: string;
  description: string;
  action: string;
}

const moduleRecommendations: Record<string, AIRecommendation[]> = {
  hrm: [
    {
      id: 'employee-completion',
      label: i18n.t('shared.recommendations.k0'),
      description: i18n.t('shared.recommendations.ai_0'),
      action: HRM_PATHS.employees,
      icon: 'user-plus',
      moduleCode: 'hrm',
    },
    {
      id: 'contract-generate',
      label: i18n.t('shared.recommendations.k1'),
      description: i18n.t('shared.recommendations.k2'),
      action: HRM_PATHS.contracts,
      icon: 'file-text',
      moduleCode: 'hrm',
    },
    {
      id: 'attendance-analysis',
      label: i18n.t('shared.recommendations.k3'),
      description: i18n.t('shared.recommendations.k4'),
      action: HRM_PATHS.attendance,
      icon: 'calendar-check',
      moduleCode: 'hrm',
    },
  ],
  crm: [
    {
      id: 'customer-scoring',
      label: i18n.t('shared.recommendations.k5'),
      description: i18n.t('shared.recommendations.k6'),
      action: CRM_PATHS.customers,
      icon: 'star',
      moduleCode: 'crm',
    },
    {
      id: 'followup-summary',
      label: i18n.t('shared.recommendations.k7'),
      description: i18n.t('shared.recommendations.k8'),
      action: CRM_PATHS.interactions,
      icon: 'message-square',
      moduleCode: 'crm',
    },
    {
      id: 'forecast-analysis',
      label: i18n.t('shared.recommendations.k9'),
      description: i18n.t('shared.recommendations.ai_1'),
      action: CRM_PATHS.salesForecast,
      icon: 'bar-chart',
      moduleCode: 'crm',
    },
  ],
  pm: [
    {
      id: 'project-summary',
      label: i18n.t('shared.recommendations.k10'),
      description: i18n.t('shared.recommendations.ai_2'),
      action: PM_PATHS.projects,
      icon: 'briefcase',
      moduleCode: 'pm',
    },
    {
      id: 'risk-analysis',
      label: i18n.t('shared.recommendations.k11'),
      description: i18n.t('shared.recommendations.k12'),
      action: PM_PATHS.reports,
      icon: 'alert-triangle',
      moduleCode: 'pm',
    },
    {
      id: 'contract-review',
      label: i18n.t('shared.recommendations.k13'),
      description: i18n.t('shared.recommendations.ai_3'),
      action: PM_PATHS.contracts,
      icon: 'file-check',
      moduleCode: 'pm',
    },
  ],
  bi: [
    {
      id: 'report-interpretation',
      label: i18n.t('shared.recommendations.k14'),
      description: i18n.t('shared.recommendations.ai_4'),
      action: BI_PATHS.report,
      icon: 'bar-chart-2',
      moduleCode: 'bi',
    },
    {
      id: 'anomaly-detection',
      label: i18n.t('shared.recommendations.k15'),
      description: i18n.t('shared.recommendations.k16'),
      action: BI_PATHS.dashboard,
      icon: 'alert-circle',
      moduleCode: 'bi',
    },
    {
      id: 'data-summary',
      label: i18n.t('shared.recommendations.k17'),
      description: i18n.t('shared.recommendations.k18'),
      action: BI_PATHS.analytics,
      icon: 'file-text',
      moduleCode: 'bi',
    },
  ],
  finance: [
    {
      id: 'expense-analysis',
      label: i18n.t('shared.recommendations.k19'),
      description: i18n.t('shared.recommendations.ai_5'),
      action: FINANCE_PATHS.root,
      icon: 'wallet',
      moduleCode: 'finance',
    },
    {
      id: 'budget-forecast',
      label: i18n.t('shared.recommendations.k20'),
      description: i18n.t('shared.recommendations.k21'),
      action: FINANCE_PATHS.budget,
      icon: 'trending-up',
      moduleCode: 'finance',
    },
    {
      id: 'report-analysis',
      label: i18n.t('shared.recommendations.k22'),
      description: i18n.t('shared.recommendations.ai_6'),
      action: FINANCE_PATHS.reports,
      icon: 'pie-chart',
      moduleCode: 'finance',
    },
  ],
  ai: [
    {
      id: 'document-generate',
      label: i18n.t('shared.recommendations.k23'),
      description: i18n.t('shared.recommendations.k24'),
      action: AI_PATHS.document,
      icon: 'file-edit',
      moduleCode: 'ai',
    },
    {
      id: 'text-analysis',
      label: i18n.t('shared.recommendations.k25'),
      description: i18n.t('shared.recommendations.k26'),
      action: AI_PATHS.chat,
      icon: 'search',
      moduleCode: 'ai',
    },
    {
      id: 'code-generate',
      label: i18n.t('shared.recommendations.k27'),
      description: i18n.t('shared.recommendations.k28'),
      action: AI_PATHS.code,
      icon: 'code',
      moduleCode: 'ai',
    },
  ],
};

const defaultRecommendations: AIRecommendation[] = [
  {
    id: 'ai-chat',
    label: i18n.t('shared.recommendations.ai_7'),
    description: i18n.t('shared.recommendations.k29'),
    action: AI_PATHS.root,
    icon: 'message-circle',
    moduleCode: 'ai',
  },
  {
    id: 'document-generate',
    label: i18n.t('shared.recommendations.k30'),
    description: i18n.t('shared.recommendations.k31'),
    action: AI_PATHS.document,
    icon: 'file-edit',
    moduleCode: 'ai',
  },
  {
    id: 'text-analysis',
    label: i18n.t('shared.recommendations.k32'),
    description: i18n.t('shared.recommendations.k33'),
    action: AI_PATHS.chat,
    icon: 'search',
    moduleCode: 'ai',
  },
];

export const quickCommands: QuickCommand[] = [
  {
    command: i18n.t('shared.recommendations.k8'),
    label: i18n.t('shared.recommendations.k34'),
    description: i18n.t('shared.recommendations.k35'),
    action: WORKFLOW_PATHS.approvals,
  },
  {
    command: i18n.t('shared.recommendations.k9'),
    label: i18n.t('shared.recommendations.k36'),
    description: i18n.t('shared.recommendations.k37'),
    action: HRM_PATHS.attendance,
  },
  {
    command: i18n.t('shared.recommendations.k10'),
    label: i18n.t('shared.recommendations.k38'),
    description: i18n.t('shared.recommendations.k39'),
    action: CRM_PATHS.customers,
  },
  {
    command: i18n.t('shared.recommendations.k11'),
    label: i18n.t('shared.recommendations.k40'),
    description: i18n.t('shared.recommendations.k41'),
    action: BI_PATHS.report,
  },
  {
    command: i18n.t('shared.recommendations.k12'),
    label: i18n.t('shared.recommendations.k42'),
    description: i18n.t('shared.recommendations.ai_13'),
    action: DASHBOARD_PATHS.help,
  },
];

export function getRecommendations(
  context: Pick<AICopilotContext, 'moduleCode'>
): AIRecommendation[] {
  return moduleRecommendations[context.moduleCode] || defaultRecommendations;
}

export function getTopRecommendations(
  context: Pick<AICopilotContext, 'moduleCode'>,
  limit = 3
): AIRecommendation[] {
  return getRecommendations(context).slice(0, limit);
}
