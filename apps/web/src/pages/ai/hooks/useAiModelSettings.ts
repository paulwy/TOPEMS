import { useState } from 'react';
import { useNotificationStore } from '@/store';
import i18n from '@/i18n';

// Module-level t for use outside React components (shadowed by useTranslation inside components)
const t = i18n.t;

export type SettingsTab = 'models' | 'config' | 'usage' | 'api';

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

export const getMockModels = (t: (key: string) => string): AIModel[] => [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    type: 'chat',
    description: t('ai.model_settings.mock.model_1_desc'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [
      t('ai.model_settings.capability.chat'),
      t('ai.model_settings.capability.reasoning'),
      t('ai.model_settings.capability.code'),
      t('ai.model_settings.capability.analysis'),
    ],
    pricing: { input_per_1k: 0.03, output_per_1k: 0.06 },
    is_default: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'chat',
    description: t('ai.model_settings.mock.model_2_desc'),
    status: 'active',
    max_tokens: 16384,
    capabilities: [
      t('ai.model_settings.capability.chat'),
      t('ai.model_settings.capability.summary'),
      t('ai.model_settings.capability.translation'),
    ],
    pricing: { input_per_1k: 0.0015, output_per_1k: 0.002 },
    is_default: false,
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'chat',
    description: t('ai.model_settings.mock.model_3_desc'),
    status: 'active',
    max_tokens: 200000,
    capabilities: [
      t('ai.model_settings.capability.chat'),
      t('ai.model_settings.capability.writing'),
      t('ai.model_settings.capability.analysis'),
      t('ai.model_settings.capability.long_text'),
    ],
    pricing: { input_per_1k: 0.015, output_per_1k: 0.075 },
    is_default: false,
  },
  {
    id: 'ernie-4.0',
    name: t('ai.model_settings.mock.model_4_name'),
    provider: t('ai.model_settings.provider.baidu'),
    type: 'chat',
    description: t('ai.model_settings.mock.model_4_desc'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [
      t('ai.model_settings.capability.chat'),
      t('ai.model_settings.capability.creation'),
      t('ai.model_settings.capability.understanding'),
    ],
    pricing: { input_per_1k: 0.008, output_per_1k: 0.008 },
    is_default: false,
  },
  {
    id: 'qwen-max',
    name: t('ai.model_settings.mock.model_5_name'),
    provider: t('ai.model_settings.provider.alibaba'),
    type: 'chat',
    description: t('ai.model_settings.mock.model_5_desc'),
    status: 'active',
    max_tokens: 32768,
    capabilities: [
      t('ai.model_settings.capability.chat'),
      t('ai.model_settings.capability.creation'),
      t('ai.model_settings.capability.code'),
    ],
    pricing: { input_per_1k: 0.004, output_per_1k: 0.008 },
    is_default: false,
  },
  {
    id: 'text-embedding-3-large',
    name: 'Text Embedding 3 Large',
    provider: 'OpenAI',
    type: 'embedding',
    description: t('ai.model_settings.mock.model_6_desc'),
    status: 'active',
    max_tokens: 8192,
    capabilities: [
      t('ai.model_settings.capability.embedding'),
      t('ai.model_settings.capability.semantic_search'),
    ],
    pricing: { input_per_1k: 0.00013, output_per_1k: 0 },
    is_default: false,
  },
];

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

export const useAiModelSettings = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<SettingsTab>('models');
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => getMockModels(t)[0]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1);
  const [systemPrompt, setSystemPrompt] = useState(
    t('ai.model_settings.config.default_system_prompt')
  );
  const [saving, setSaving] = useState(false);

  const handleSaveConfig = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      addNotification({
        title: t('ai.model_settings.message.save_success_title'),
        message: t('ai.model_settings.message.save_success_body'),
        type: 'success',
      });
    }, 1000);
  };

  const totalUsage = {
    tokens: usageData.reduce((sum, d) => sum + d.tokens, 0),
    cost: usageData.reduce((sum, d) => sum + d.cost, 0),
    requests: usageData.reduce((sum, d) => sum + d.requests, 0),
  };

  return {
    activeTab,
    setActiveTab,
    selectedModel,
    setSelectedModel,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topP,
    setTopP,
    systemPrompt,
    setSystemPrompt,
    saving,
    handleSaveConfig,
    totalUsage,
  };
};
