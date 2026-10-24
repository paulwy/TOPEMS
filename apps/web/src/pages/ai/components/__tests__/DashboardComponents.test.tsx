import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '@/__tests__/test-utils';

import { DashboardQuickActions } from '../DashboardQuickActions';
import { DashboardStats } from '../DashboardStats';
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

const { i18nMap } = vi.hoisted(() => {
  const deepMerge = (...objs: Record<string, unknown>[]): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const o of objs) {
      for (const [k, v] of Object.entries(o)) {
        out[k] =
          v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object'
            ? deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>)
            : v;
      }
    }
    return out;
  };
  const i18nMap = deepMerge(
    require('../../../../i18n/locales/zh/ai.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json')
  );
  return { i18nMap };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key
        .split('.')
        .reduce(
          (o: unknown, k: string) =>
            o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined,
          i18nMap
        ) ?? key,
  }),
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

  it('渲染 Dashboard 拆分组件（QuickActions/Stats/FeatureCard/MiniChart/RecentItem）', () => {
    renderWithProviders(
      <>
        <DashboardQuickActions
          actions={quickActions}
          isMobile={false}
        />
        <DashboardStats
          stats={stats}
          isMobile={false}
        />
        {features.map((f) => (
          <FeatureCard
            key={f.id}
            {...f}
          />
        ))}
        <MiniChart
          data={[1, 3, 2, 5]}
          color='#1976d2'
        />
        {recentItems.map((r) => (
          <RecentItem
            key={r.id}
            {...r}
          />
        ))}
      </>
    );

    expect(screen.getByText('Start Chat')).toBeInTheDocument();
    expect(screen.getByText('Analyze Document')).toBeInTheDocument();
    expect(screen.getByText('Chat Count')).toBeInTheDocument();
    expect(screen.getByText('1,256')).toBeInTheDocument();
    expect(screen.getByText('Smart Q&A')).toBeInTheDocument();
    expect(screen.getByText('Answer production questions')).toBeInTheDocument();
    expect(screen.getByText('Accuracy: 92%')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Production summary')).toBeInTheDocument();
    expect(screen.getByText('Code review')).toBeInTheDocument();
  });
});
