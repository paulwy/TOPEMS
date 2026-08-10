import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { DashboardFeatures } from '../DashboardFeatures';
import { DashboardHero } from '../DashboardHero';
import { DashboardQuickActions } from '../DashboardQuickActions';
import { DashboardRecentActivity } from '../DashboardRecentActivity';
import { DashboardStats } from '../DashboardStats';
import { DashboardTrend } from '../DashboardTrend';
import { FeatureCard } from '../FeatureCard';
import { MiniChart } from '../MiniChart';
import { RecentItem } from '../RecentItem';
import type {
  FeatureCardData,
  QuickActionData,
  RecentItemData,
  StatCardData,
} from '../../hooks/useAiDashboard';

const shared = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => shared.navigate,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<typeof import('lucide-react')>('lucide-react');
  return {
    ...actual,
    ArrowRight: () => <svg data-testid='icon-arrow-right' />,
    CircleDot: (props: React.SVGProps<SVGSVGElement>) => (
      <svg
        data-testid='icon-status'
        {...props}
      />
    ),
    Code: () => <svg data-testid='icon-code' />,
    FileText: () => <svg data-testid='icon-file' />,
    Lightbulb: () => <svg data-testid='icon-lightbulb' />,
    MessageSquare: () => <svg data-testid='icon-message' />,
    Sparkles: () => <svg data-testid='icon-sparkles' />,
  };
});

const TestIcon = ({ style }: { size?: number; style?: React.CSSProperties }) => (
  <span
    data-testid='test-icon'
    style={style}
  >
    ICN
  </span>
);

const stats: StatCardData[] = [
  {
    id: 'chat-count',
    title: 'Chat Count',
    value: '1,256',
    icon: <TestIcon />,
    change: 23,
    changeLabel: 'vs last month',
    color: 'primary',
    onClick: vi.fn(),
  },
  {
    id: 'avg-response',
    title: 'Average Response',
    value: '1.2s',
    icon: <TestIcon />,
    change: -0.3,
    changeLabel: 'seconds down',
    color: 'secondary',
  },
];

const quickActions: QuickActionData[] = [
  {
    id: 'start-chat',
    label: 'Start Chat',
    icon: <TestIcon />,
    color: 'primary',
    description: 'Begin a conversation',
    onClick: vi.fn(),
  },
  {
    id: 'doc-analysis',
    label: 'Analyze Document',
    icon: <TestIcon />,
    color: 'info',
    description: 'Upload and summarize',
    onClick: vi.fn(),
  },
];

const recentItems: RecentItemData[] = [
  {
    id: 'recent-1',
    title: 'Production summary',
    description: 'Generated 2 minutes ago',
    status: 'success',
    type: 'summary',
    onClick: vi.fn(),
  },
  {
    id: 'recent-2',
    title: 'Code review',
    description: 'Completed successfully',
    status: 'info',
    type: 'code',
    onClick: vi.fn(),
  },
];

const features: FeatureCardData[] = [
  {
    id: 'qa-feature',
    title: 'Smart Q&A',
    description: 'Answer production questions',
    icon: <TestIcon />,
    color: '#1976d2',
    stats: [
      { label: 'Accuracy', value: '92%' },
      { label: 'Response', value: '<2s' },
    ],
    action: {
      label: 'Try Q&A',
      onClick: vi.fn(),
    },
  },
  {
    id: 'code-feature',
    title: 'Code Assistant',
    description: 'Generate and explain code',
    icon: <TestIcon />,
    color: '#2e7d32',
    stats: [{ label: 'Languages', value: '20+' }],
    action: {
      label: 'Open Code',
      onClick: vi.fn(),
    },
  },
];

describe('AI Dashboard 拆分组件渲染测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.navigate.mockClear();
  });

  it('DashboardHero 渲染欢迎区并导航到聊天和提示词库', () => {
    renderWithProviders(<DashboardHero />);

    expect(screen.getByText('ai.dashboard.hero_title')).toBeInTheDocument();
    expect(screen.getByText('ai.dashboard.hero_welcomeai.dashboard.hero_desc')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ai.dashboard.button.start_chat' }));
    expect(shared.navigate).toHaveBeenCalledWith('/ai/chat');

    fireEvent.click(screen.getByRole('button', { name: 'ai.dashboard.button.view_prompts' }));
    expect(shared.navigate).toHaveBeenCalledWith('/ai/prompts');
  });

  it('DashboardStats 渲染统计区标题、卡片和点击回调', () => {
    renderWithProviders(
      <DashboardStats
        stats={stats}
        isMobile={false}
      />
    );

    expect(screen.getByText('ai.dashboard.section.usage_stats')).toBeInTheDocument();
    expect(screen.getByText('Chat Count')).toBeInTheDocument();
    expect(screen.getByText('1,256')).toBeInTheDocument();
    expect(screen.getByText('Average Response')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Chat Count'));
    expect(stats[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('DashboardQuickActions 渲染快捷入口并触发动作', () => {
    renderWithProviders(
      <DashboardQuickActions
        actions={quickActions}
        isMobile
      />
    );

    expect(screen.getByText('ai.dashboard.section.quick_entry')).toBeInTheDocument();
    expect(screen.getByText('Begin a conversation')).toBeInTheDocument();
    expect(screen.getByText('Upload and summarize')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Start Chat'));
    expect(quickActions[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('FeatureCard 渲染功能说明、指标和动作按钮', () => {
    const action = vi.fn();

    renderWithProviders(
      <FeatureCard
        {...features[0]}
        action={{ label: 'Try Q&A', onClick: action }}
      />
    );

    expect(screen.getByText('Smart Q&A')).toBeInTheDocument();
    expect(screen.getByText('Answer production questions')).toBeInTheDocument();
    expect(screen.getByText('Accuracy: 92%')).toBeInTheDocument();
    expect(screen.getByText('Response: <2s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Q&A' }));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('DashboardFeatures 渲染多个核心功能卡片', () => {
    renderWithProviders(<DashboardFeatures features={features} />);

    expect(screen.getByText('ai.dashboard.section.core_features')).toBeInTheDocument();
    expect(screen.getByText('Smart Q&A')).toBeInTheDocument();
    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    expect(screen.getByText('Languages: 20+')).toBeInTheDocument();
  });

  it('RecentItem 渲染最近活动并响应点击', () => {
    const onClick = vi.fn();

    renderWithProviders(
      <RecentItem
        {...recentItems[0]}
        onClick={onClick}
      />
    );

    expect(screen.getByText('Production summary')).toBeInTheDocument();
    expect(screen.getByText('Generated 2 minutes ago')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Production summary'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('DashboardRecentActivity 渲染最近使用列表并支持查看更多导航', () => {
    renderWithProviders(<DashboardRecentActivity items={recentItems} />);

    expect(screen.getByText('ai.dashboard.section.recent_used')).toBeInTheDocument();
    expect(screen.getByText('Production summary')).toBeInTheDocument();
    expect(screen.getByText('Code review')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Code review'));
    expect(recentItems[1].onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'ai.dashboard.button.view_more' }));
    expect(shared.navigate).toHaveBeenCalledWith('/ai/chat');
  });

  it('MiniChart 基于数据渲染折线、面积和数据点', () => {
    const { container } = renderWithProviders(
      <MiniChart
        data={[120, 150, 130, 180]}
        color='#1976d2'
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('path')).toHaveAttribute(
      'd',
      'M 0,90 L 33.33333333333333,50 L 66.66666666666666,76.66666666666667 L 100,10 L 100,40 L 0,40 Z'
    );
    expect(container.querySelector('polyline')).toHaveAttribute(
      'points',
      '0,90 33.33333333333333,50 66.66666666666666,76.66666666666667 100,10'
    );
    expect(container.querySelectorAll('circle')).toHaveLength(4);
  });

  it('MiniChart 在数据一致时仍渲染稳定图形', () => {
    const { container } = renderWithProviders(
      <MiniChart
        data={[100, 100, 100]}
        color='#2e7d32'
      />
    );

    expect(container.querySelector('polyline')).toHaveAttribute('points', '0,90 50,90 100,90');
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('DashboardTrend 渲染趋势标题、状态和一周标签', () => {
    const { container } = renderWithProviders(<DashboardTrend usageData={[120, 150, 130, 180]} />);

    expect(screen.getByText('ai.dashboard.section.usage_trend')).toBeInTheDocument();
    expect(screen.getByText('ai.dashboard.trend.7_days_chat_count')).toBeInTheDocument();
    expect(screen.getByText('ai.dashboard.trend.good')).toBeInTheDocument();
    expect(screen.getByText('ai.dashboard.day.mon')).toBeInTheDocument();
    expect(screen.getByText('ai.dashboard.day.sun')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
