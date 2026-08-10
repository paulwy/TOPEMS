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

  it('AiModelSettingsList 渲染模型卡片并触发选择回调', () => {
    const onSelectModel = vi.fn();

    renderWithProviders(
      <AiModelSettingsList
        selectedModel={selectedModel}
        onSelectModel={onSelectModel}
      />
    );

    expect(screen.getByText('GPT-4')).toBeInTheDocument();
    expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();
    expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.field.default')).toBeInTheDocument();
    expect(screen.getAllByText('ai.model_settings.status.active').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('8,192').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$0.03/1K')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Claude 3 Opus'));
    expect(onSelectModel).toHaveBeenCalledWith(expect.objectContaining({ id: 'claude-3-opus' }));
  });

  it('AiModelSettingsForm 渲染当前模型配置和参数值', () => {
    renderWithProviders(
      <AiModelSettingsForm
        selectedModel={selectedModel}
        temperature={0.7}
        maxTokens={2048}
        topP={0.9}
        systemPrompt='你是 TOPEMS 智能助手'
        saving={false}
        onTemperatureChange={vi.fn()}
        onMaxTokensChange={vi.fn()}
        onTopPChange={vi.fn()}
        onSystemPromptChange={vi.fn()}
        onSaveConfig={vi.fn()}
      />
    );

    expect(screen.getByText('ai.model_settings.config.current_model:GPT-4')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.config.temperature')).toBeInTheDocument();
    expect(screen.getAllByText('0.7').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2048').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.9').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('你是 TOPEMS 智能助手')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.config.streaming_output')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.config.auto_retry')).toBeInTheDocument();
  });

  it('AiModelSettingsForm 触发系统提示词变更和保存配置', () => {
    const onSystemPromptChange = vi.fn();
    const onSaveConfig = vi.fn();

    renderWithProviders(
      <AiModelSettingsForm
        selectedModel={selectedModel}
        temperature={0.7}
        maxTokens={2048}
        topP={1}
        systemPrompt='默认提示词'
        saving={false}
        onTemperatureChange={vi.fn()}
        onMaxTokensChange={vi.fn()}
        onTopPChange={vi.fn()}
        onSystemPromptChange={onSystemPromptChange}
        onSaveConfig={onSaveConfig}
      />
    );

    fireEvent.change(screen.getByDisplayValue('默认提示词'), {
      target: { value: '新的系统提示词' },
    });
    expect(onSystemPromptChange).toHaveBeenCalledWith('新的系统提示词');

    fireEvent.click(screen.getByRole('button', { name: 'ai.model_settings.action.save_config' }));
    expect(onSaveConfig).toHaveBeenCalledTimes(1);
  });

  it('AiModelSettingsForm 保存中时禁用保存按钮并显示保存状态', () => {
    renderWithProviders(
      <AiModelSettingsForm
        selectedModel={selectedModel}
        temperature={0.7}
        maxTokens={2048}
        topP={1}
        systemPrompt='默认提示词'
        saving
        onTemperatureChange={vi.fn()}
        onMaxTokensChange={vi.fn()}
        onTopPChange={vi.fn()}
        onSystemPromptChange={vi.fn()}
        onSaveConfig={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'ai.model_settings.status.saving' })).toBeDisabled();
    expect(screen.getAllByTestId('icon-refresh').length).toBeGreaterThanOrEqual(1);
  });

  it('AiModelUsageStats 渲染用量概览、图表和每日明细', () => {
    renderWithProviders(
      <AiModelUsageStats
        totalUsage={{
          tokens: 435000,
          requests: 3090,
          cost: 24.6,
        }}
      />
    );

    expect(screen.getByText('435K')).toBeInTheDocument();
    expect(screen.getByText('3090')).toBeInTheDocument();
    expect(screen.getByText('$24.60')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.usage.total_tokens')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.usage.trend_7days')).toBeInTheDocument();
    expect(screen.getByText('ai.model_settings.usage.model_ratio')).toBeInTheDocument();
    expect(screen.getByTestId('lazy-chart-line')).toHaveTextContent('7');
    expect(screen.getByTestId('lazy-chart-pie')).toHaveTextContent('5');
    expect(screen.getByText('06-15')).toBeInTheDocument();
    expect(screen.getByText('45,000')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
  });
});
