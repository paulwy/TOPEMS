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
} from '../../hooks/UseAiDashboard';

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
});
