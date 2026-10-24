import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'embedding' | 'image' | 'audio';
  description: string;
  status: 'active' | 'inactive' | 'maintenance';
  max_tokens: number;
  capabilities: string[];
  pricing: {
    input_per_1k: number;
    output_per_1k: number;
  };
  is_default: boolean;
}

export interface UsageData {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface ModelUsageData {
  name: string;
  value: number;
}

export const usageData: UsageData[] = [
  { date: '06-15', tokens: 45000, cost: 2.5, requests: 320 },
  { date: '06-16', tokens: 58000, cost: 3.2, requests: 410 },
  { date: '06-17', tokens: 52000, cost: 2.9, requests: 380 },
  { date: '06-18', tokens: 67000, cost: 3.8, requests: 450 },
  { date: '06-19', tokens: 72000, cost: 4.1, requests: 520 },
  { date: '06-20', tokens: 61000, cost: 3.5, requests: 430 },
  { date: '06-21', tokens: 80000, cost: 4.6, requests: 580 },
];

export const modelUsageData: ModelUsageData[] = [
  { name: 'GPT-4', value: 35 },
  { name: 'GPT-3.5', value: 40 },
  { name: 'Claude', value: 15 },
  { name: t('ai.model_settings.model.ernie'), value: 6 },
  { name: t('ai.model_settings.model.qwen'), value: 4 },
];

export const getStatusConfig = (status: AIModel['status']) => {
  const configs = {
    active: {
      label: t('ai.model_settings.status.active'),
      color: 'success' as const,
      icon: 'CheckCircle2',
    },
    inactive: {
      label: t('ai.model_settings.status.inactive'),
      color: 'default' as const,
      icon: 'Clock',
    },
    maintenance: {
      label: t('ai.model_settings.status.maintenance'),
      color: 'warning' as const,
      icon: 'AlertCircle',
    },
  };
  return configs[status];
};
