import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { AiModelProviderConfig } from '../AiModelProviderConfig';
import { AiModelSettingsForm } from '../AiModelSettingsForm';
import { AiModelSettingsList } from '../AiModelSettingsList';
import { AiModelUsageStats } from '../AiModelUsageStats';
import type { AIModel } from '../../hooks/useAiModelSettings';

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('@/components/common', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/charts', () => ({
  LazyChart: ({ type, data }: { type: string; data: unknown[] }) => (
    <div data-testid={`lazy-chart-${type}`}>{data.length}</div>
  ),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
    Activity: () => <svg data-testid='icon-activity' />,
    AlertCircle: () => <svg data-testid='icon-alert' />,
    CheckCircle2: () => <svg data-testid='icon-check-circle' />,
    Clock: () => <svg data-testid='icon-clock' />,
    Cpu: () => <svg data-testid='icon-cpu' />,
    DollarSign: () => <svg data-testid='icon-dollar' />,
    Edit3: () => <svg data-testid='icon-edit' />,
    Layers: () => <svg data-testid='icon-layers' />,
    RefreshCw: () => <svg data-testid='icon-refresh' />,
    Save: () => <svg data-testid='icon-save' />,
    Server: () => <svg data-testid='icon-server' />,
    Zap: () => <svg data-testid='icon-zap' />,
    TrendingUp: () => <svg data-testid='icon-trending-up' />,
  };
});

const selectedModel: AIModel = {
  id: 'gpt-4',
  name: 'GPT-4',
  provider: 'OpenAI',
  type: 'chat',
  description: '强大的通用对话模型',
  status: 'active',
  max_tokens: 8192,
  capabilities: ['对话', '代码', '分析'],
  pricing: {
    input_per_1k: 0.03,
    output_per_1k: 0.06,
  },
  is_default: true,
};

describe('AI 模型设置拆分组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AiModelProviderConfig 渲染 API Key 表格和安全提示', () => {
    renderWithProviders(<AiModelProviderConfig />);

    expect(screen.getByText('ai.model_settings.api.key_management')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'ai.model_settings.action.add_key' })
    ).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.api.key_production')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.api.key_backup')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.api.key_ernie')).toBeInTheDocument();
    expect(screen.getAllByText('sk-****************************')).toHaveLength(2);
    expect(screen.getByText('xx-****************************')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.api.usage_tips')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.api.tip_rotate_keys')).toBeInTheDocument();
  });
});
