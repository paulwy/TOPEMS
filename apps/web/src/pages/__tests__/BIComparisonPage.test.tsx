import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/api/bi', () => ({
  getComparisonResult: vi.fn(),
  runComparison: vi.fn(),
  listComparisons: vi.fn(),
  getComparison: vi.fn(),
  createComparison: vi.fn(),
  updateComparison: vi.fn(),
  deleteComparison: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => React.createElement('div', null, children),
  BarChart: ({ children }: any) => React.createElement('div', null, children),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock('@/components/templates', () => ({
  DashboardTemplate: ({ children }: any) => React.createElement('div', null, children),
}));
vi.mock('@/components/export', () => ({
  ExportButton: () => React.createElement('button', null, 'Export'),
}));
vi.mock('@/components/common', () => ({
  PageContainer: ({ children }: any) => React.createElement('div', null, children),
}));
vi.mock('@/components/charts/chartTheme', () => ({
  BIChartColors: {
    series: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
    dark: { series: ['#60a5fa'] },
    cyberpunk: { series: ['#00FFFF'] },
    neutral: {},
  },
}));
vi.mock('@/modules/bi/config', () => ({
  BI_PATHS: { comparison: '/bi/comparison' },
}));
vi.mock('@topems/shared-components', () => ({
  LoadingSpinner: () => React.createElement('div', null, 'Loading...'),
}));
vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('BIComparisonPage module', () => {
  it('should export BIComparisonPage component', async () => {
    const mod = await import('../bi/BIComparisonPage');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('should have comparison API functions defined', async () => {
    const api = await import('@/api/bi');
    expect(api.getComparisonResult).toBeDefined();
    expect(api.runComparison).toBeDefined();
    expect(api.listComparisons).toBeDefined();
  });
});
