import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import AiAssistantFlowTab from '../AiAssistantFlowTab';
import AiAssistantKnowledgeTab from '../AiAssistantKnowledgeTab';
import MetricCard from '../AiAssistantMetricCard';
import AiAssistantReportTab from '../AiAssistantReportTab';
import type {
  AnomalyPredictResponse,
  FlowAssistantResponse,
  KnowledgeAskResponse,
  ReportAssistantResponse,
} from '@/api/ai';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
    Minus: () => <svg data-testid='icon-minus' />,
    Send: () => <svg data-testid='icon-send' />,
    Sparkles: () => <svg data-testid='icon-sparkles' />,
    TrendingDown: () => <svg data-testid='icon-trending-down' />,
    TrendingUp: () => <svg data-testid='icon-trending-up' />,
  };
});

vi.mock('recharts', () => ({
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div data-testid='recharts-grid' />,
  Cell: () => <div data-testid='recharts-cell' />,
  Legend: () => <div data-testid='recharts-legend' />,
  Line: () => <div data-testid='recharts-line' />,
  LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='recharts-responsive'>{children}</div>
  ),
  Tooltip: () => <div data-testid='recharts-tooltip' />,
  XAxis: () => <div data-testid='recharts-x-axis' />,
  YAxis: () => <div data-testid='recharts-y-axis' />,
}));

const reportResult: ReportAssistantResponse = {
  query: '统计产量',
  chart_type: 'table',
  title: '产量分析报表',
  description: '按车间汇总产量',
  sql: 'select workshop, output from mes_output',
  data: [
    { workshop: '一车间', output: 1200 },
    { workshop: '二车间', output: 980 },
  ],
};

const metricReportResult: ReportAssistantResponse = {
  query: '关键指标',
  chart_type: 'metric',
  title: '核心指标',
  data: [],
  metrics: [
    { label: 'OEE', value: 86, unit: '%' },
    { label: '良品率', value: 98, unit: '%' },
  ],
};

const flowResult: FlowAssistantResponse = {
  query: '优化采购审批',
  title: '采购审批流程优化',
  description: '建议减少重复审批节点',
  steps: [
    {
      step: 1,
      name: '提交采购申请',
      description: '申请人填写采购需求',
      responsible: '申请人',
      estimated_time: '10分钟',
    },
    {
      step: 2,
      name: '部门审批',
      description: '部门负责人确认预算',
    },
  ],
  suggestions: ['合并低金额采购审批节点', '自动校验预算余额'],
};

const anomalyResult: AnomalyPredictResponse = {
  metric: '设备温度',
  anomaly_count: 2,
  summary: '检测到两处高温异常',
  anomalies: [
    {
      timestamp: '2026-08-11 09:00',
      value: 91,
      expected: 72,
      severity: 'high',
      reason: '温度超过控制上限',
    },
    {
      timestamp: '2026-08-11 10:00',
      value: 84,
      expected: 73,
      severity: 'medium',
    },
  ],
  suggestions: ['检查冷却系统', '安排设备点检'],
};

const knowledgeResult: KnowledgeAskResponse = {
  question: '如何处理质量异常？',
  answer: '先隔离异常批次，再发起不合格品评审。',
  confidence: 0.91,
  sources: [
    {
      title: '质量异常处理规范',
      content: '异常批次需要隔离并记录处置过程。',
      relevance: 0.88,
    },
  ],
  follow_up_questions: ['需要哪些审批人？', '是否需要生成 CAPA？'],
};

describe('AI Assistant 拆分组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MetricCard 渲染数值、单位和趋势图标', () => {
    const { rerender } = renderWithProviders(
      <MetricCard
        label='OEE'
        value={86}
        unit='%'
        trend='up'
      />
    );

    expect(screen.getByText('OEE')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
    expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();

    rerender(
      <MetricCard
        label='缺陷数'
        value={3}
        trend='down'
      />
    );
    expect(screen.getByTestId('icon-trending-down')).toBeInTheDocument();
  });
});
