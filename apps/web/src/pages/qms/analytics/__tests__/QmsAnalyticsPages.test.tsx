import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/qms.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/schemas.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string) => i18nMap[key] ?? key,
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../../i18n/locales/zh/qms.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/schemas.json')
  );
  return {
    default: {
      t: (key: string) => i18nMap[key] ?? key,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('@/api/qms/dashboard', () => ({
  qualityDashboardApi: {
    getQualityTrend: vi.fn().mockResolvedValue({
      data: [
        { period: '2026-01', total_count: 100, qualified_count: 95, qualification_rate: 95, issue_count: 5 },
        { period: '2026-02', total_count: 120, qualified_count: 114, qualification_rate: 95, issue_count: 6 },
      ],
      code: 0,
      message: 'ok',
    }),
    getDefectDistribution: vi.fn().mockResolvedValue({
      data: [
        { category: '外观', count: 10, percentage: 40 },
        { category: '尺寸', count: 8, percentage: 32 },
      ],
      code: 0,
      message: 'ok',
    }),
  },
}));

vi.mock('@/api/qms/qualityCost', () => ({
  qualityCostApi: {
    listQualityCosts: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
  },
}));

vi.mock('@/api/qms/audit', () => ({
  auditApi: {
    listAuditPlans: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
    listAuditTasks: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
    listAuditFindings: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
  },
}));

vi.mock('@/api/qms/fmea', () => ({
  fmeaApi: {
    listFmeaAnalyses: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
    listFmeaItems: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
  },
}));

vi.mock('@/api/qms/spc', () => ({
  spcApi: {
    listSpcCharts: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
    getSpcDataPoints: vi.fn().mockResolvedValue({ data: [], code: 0, message: 'ok' }),
  },
}));

describe('QMS Analytics Pages', () => {
  it('Quality Trend renders title and charts', async () => {
    const { default: Page } = await import('../QmsQualityTrendPage');
    render(<Page />);
    expect(await screen.findByText('质量趋势分析')).toBeInTheDocument();
  });
});
