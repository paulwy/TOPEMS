import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

const { tMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'pages.wms_inventory_turnover_page.k0': '库存周转率分析',
    'pages.wms_inventory_turnover_page.k1': '平均周转率',
    'pages.wms_inventory_turnover_page.k2': '平均周转天数',
    'pages.wms_inventory_turnover_page.k3': '仓库数',
    'pages.wms_inventory_turnover_page.k4': '记录数',
    'pages.wms_inventory_turnover_page.k5': '月度周转率趋势',
    'pages.wms_inventory_turnover_page.k6': '周转率',
    'pages.wms_inventory_turnover_page.summaryavgdays_0': '天',
    'wms.analytics.agePareto.k0': '库龄帕累托分析（80/20 规则）',
    'pages.wms_flow_trend_page.30_0': '出入库流量趋势（最近 30 天）',
    'wms_abc_analysis_page.abc702010_5': 'ABC 分类分析（帕累托 70/20/10）',
    'wms:wms_abc_analysis_page.abc702010_5': 'ABC 分类分析（帕累托 70/20/10）',
    'wms:wms_abc_analysis_page.a70_4': 'A类（70% 金额）',
    'wms:wms_abc_analysis_page.b20_3': 'B类（20% 金额）',
    'wms:wms_abc_analysis_page.c10_2': 'C类（10% 金额）',
    'pages.wms_location_utilization_page.k0': '库位利用率分析',
    'pages.wms_order_fulfillment_page.sla_0': '订单履约与 SLA 分析',
  };

  const tMock = (key: string): string => {
    return i18nMap[key] || key;
  };

  return { tMock };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    off: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
    changeLanguage: () => {},
  },
  SUPPORTED_LANGUAGES: [
    { code: 'zh', name: '中文', flag: 'CN' },
    { code: 'en', name: 'English', flag: 'US' },
  ],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: 'zh',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => {
    if (i18nKey) {
      return <span>{tMock(i18nKey)}</span>;
    }
    return <span>{children}</span>;
  },
}));

import WmsInventoryTurnoverPage from '@/pages/wms/analytics/WmsInventoryTurnoverPage';
import WmsAgeParetoPage from '@/pages/wms/analytics/WmsAgeParetoPage';
import WmsFlowTrendPage from '@/pages/wms/analytics/WmsFlowTrendPage';
import WmsAbcAnalysisPage from '@/pages/wms/analytics/WmsAbcAnalysisPage';
import WmsLocationUtilizationPage from '@/pages/wms/analytics/WmsLocationUtilizationPage';
import WmsOrderFulfillmentPage from '@/pages/wms/analytics/WmsOrderFulfillmentPage';

describe('WMS BI Analytics Pages', () => {
  it('WmsInventoryTurnoverPage renders title without crashing', () => {
    render(<WmsInventoryTurnoverPage />);
    expect(screen.getByText('库存周转率分析')).toBeInTheDocument();
  });

  it('WmsAgeParetoPage renders title without crashing', () => {
    render(<WmsAgeParetoPage />);
    expect(screen.getByText(/库龄帕累托分析/)).toBeInTheDocument();
  });

  it('WmsFlowTrendPage renders title without crashing', () => {
    render(<WmsFlowTrendPage />);
    expect(screen.getByText(/出入库流量趋势/)).toBeInTheDocument();
  });

  it('WmsAbcAnalysisPage renders title without crashing', () => {
    render(<WmsAbcAnalysisPage />);
    expect(screen.getByText(/ABC 分类分析/)).toBeInTheDocument();
  });

  it('WmsLocationUtilizationPage renders title without crashing', () => {
    render(<WmsLocationUtilizationPage />);
    expect(screen.getByText('库位利用率分析')).toBeInTheDocument();
  });

  it('WmsOrderFulfillmentPage renders title without crashing', () => {
    render(<WmsOrderFulfillmentPage />);
    expect(screen.getByText(/订单履约与 SLA 分析/)).toBeInTheDocument();
  });
});
