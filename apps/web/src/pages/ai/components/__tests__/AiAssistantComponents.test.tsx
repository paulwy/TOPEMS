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

  it('报表助手表单渲染输入项，空查询时禁用提交', () => {
    renderWithProviders(
      <AiAssistantReportTab
        reportQuery=''
        setReportQuery={vi.fn()}
        reportDataSource='MES'
        setReportDataSource={vi.fn()}
        reportTimeRange='近7天'
        setReportTimeRange={vi.fn()}
        loading={false}
        reportResult={null}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('ai.assistant.report.title')).toBeInTheDocument();
    expect(screen.getByLabelText('ai.assistant.report.label.query')).toHaveValue('');
    expect(screen.getByLabelText('ai.assistant.report.label.data_source')).toHaveValue('MES');
    expect(screen.getByLabelText('ai.assistant.report.label.time_range')).toHaveValue('近7天');
    expect(
      screen.getByRole('button', { name: 'ai.assistant.report.button.generate' })
    ).toBeDisabled();
  });

  it('报表助手触发输入和提交，并渲染表格结果', () => {
    const setReportQuery = vi.fn();
    const onSubmit = vi.fn();

    renderWithProviders(
      <AiAssistantReportTab
        reportQuery='统计产量'
        setReportQuery={setReportQuery}
        reportDataSource='MES'
        setReportDataSource={vi.fn()}
        reportTimeRange='近7天'
        setReportTimeRange={vi.fn()}
        loading={false}
        reportResult={reportResult}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('ai.assistant.report.label.query'), {
      target: { value: '统计良品率' },
    });
    expect(setReportQuery).toHaveBeenCalledWith('统计良品率');

    fireEvent.click(screen.getByRole('button', { name: 'ai.assistant.report.button.generate' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('产量分析报表')).toBeInTheDocument();
    expect(screen.getByText('select workshop, output from mes_output')).toBeInTheDocument();
    expect(screen.getByText('一车间')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('报表助手渲染指标结果视图', () => {
    renderWithProviders(
      <AiAssistantReportTab
        reportQuery='关键指标'
        setReportQuery={vi.fn()}
        reportDataSource=''
        setReportDataSource={vi.fn()}
        reportTimeRange=''
        setReportTimeRange={vi.fn()}
        loading={false}
        reportResult={metricReportResult}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('核心指标')).toBeInTheDocument();
    expect(screen.getByText('OEE')).toBeInTheDocument();
    expect(screen.getByText('良品率')).toBeInTheDocument();
  });

  it('流程助手渲染流程表单、结果步骤和优化建议', () => {
    const setFlowQuery = vi.fn();
    const onFlowSubmit = vi.fn();

    renderWithProviders(
      <AiAssistantFlowTab
        flowQuery='优化采购审批'
        setFlowQuery={setFlowQuery}
        flowModule='SCM'
        setFlowModule={vi.fn()}
        flowResult={flowResult}
        onFlowSubmit={onFlowSubmit}
        anomalyMetric=''
        setAnomalyMetric={vi.fn()}
        anomalyTimeRange=''
        setAnomalyTimeRange={vi.fn()}
        anomalyResult={null}
        onAnomalySubmit={vi.fn()}
        loading={false}
      />
    );

    fireEvent.change(screen.getByLabelText('ai.assistant.flow.label.query'), {
      target: { value: '优化入库流程' },
    });
    expect(setFlowQuery).toHaveBeenCalledWith('优化入库流程');

    fireEvent.click(screen.getByRole('button', { name: 'ai.assistant.flow.button.analyze' }));
    expect(onFlowSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('采购审批流程优化')).toBeInTheDocument();
    expect(screen.getByText('提交采购申请')).toBeInTheDocument();
    expect(screen.getByText('ai.assistant.flow.responsible:申请人')).toBeInTheDocument();
    expect(screen.getByText('ai.assistant.flow.estimated_time:10分钟')).toBeInTheDocument();
    expect(screen.getByText('合并低金额采购审批节点')).toBeInTheDocument();
  });

  it('流程助手渲染异常预测结果和建议', () => {
    const setAnomalyMetric = vi.fn();
    const onAnomalySubmit = vi.fn();

    renderWithProviders(
      <AiAssistantFlowTab
        flowQuery=''
        setFlowQuery={vi.fn()}
        flowModule=''
        setFlowModule={vi.fn()}
        flowResult={null}
        onFlowSubmit={vi.fn()}
        anomalyMetric='设备温度'
        setAnomalyMetric={setAnomalyMetric}
        anomalyTimeRange='今日'
        setAnomalyTimeRange={vi.fn()}
        anomalyResult={anomalyResult}
        onAnomalySubmit={onAnomalySubmit}
        loading={false}
      />
    );

    fireEvent.change(screen.getByLabelText('ai.assistant.anomaly.label.metric'), {
      target: { value: '设备振动' },
    });
    expect(setAnomalyMetric).toHaveBeenCalledWith('设备振动');

    fireEvent.click(screen.getByRole('button', { name: 'ai.assistant.anomaly.button.predict' }));
    expect(onAnomalySubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ai.assistant.anomaly.result_title：设备温度')).toBeInTheDocument();
    expect(screen.getByText('检测到两处高温异常')).toBeInTheDocument();
    expect(screen.getByText('2026-08-11 09:00')).toBeInTheDocument();
    expect(screen.getByText('ai.assistant.severity.high')).toBeInTheDocument();
    expect(screen.getByText('检查冷却系统')).toBeInTheDocument();
  });

  it('知识库助手渲染问答表单、来源和追问', () => {
    const setKnowledgeQuestion = vi.fn();
    const onSubmit = vi.fn();

    renderWithProviders(
      <AiAssistantKnowledgeTab
        knowledgeQuestion='如何处理质量异常？'
        setKnowledgeQuestion={setKnowledgeQuestion}
        knowledgeBase='QMS'
        setKnowledgeBase={vi.fn()}
        knowledgeResult={knowledgeResult}
        loading={false}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('ai.assistant.knowledge.label.question'), {
      target: { value: '质量异常怎么闭环？' },
    });
    expect(setKnowledgeQuestion).toHaveBeenCalledWith('质量异常怎么闭环？');

    fireEvent.click(screen.getByRole('button', { name: 'ai.assistant.knowledge.button.ask' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ai.assistant.knowledge.ai_answer')).toBeInTheDocument();
    expect(screen.getByText('先隔离异常批次，再发起不合格品评审。')).toBeInTheDocument();
    expect(screen.getByText('质量异常处理规范')).toBeInTheDocument();
    expect(screen.getByText('ai.assistant.knowledge.relevance:88')).toBeInTheDocument();
    expect(screen.getByText('需要哪些审批人？')).toBeInTheDocument();
  });

  it('知识库助手在空问题或加载中禁用提交', () => {
    const { rerender } = renderWithProviders(
      <AiAssistantKnowledgeTab
        knowledgeQuestion=''
        setKnowledgeQuestion={vi.fn()}
        knowledgeBase=''
        setKnowledgeBase={vi.fn()}
        knowledgeResult={null}
        loading={false}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: 'ai.assistant.knowledge.button.ask' })
    ).toBeDisabled();

    rerender(
      <AiAssistantKnowledgeTab
        knowledgeQuestion='问题'
        setKnowledgeQuestion={vi.fn()}
        knowledgeBase=''
        setKnowledgeBase={vi.fn()}
        knowledgeResult={null}
        loading
        onSubmit={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'ai.assistant.knowledge.button.ask' })
    ).toBeDisabled();
  });
});
