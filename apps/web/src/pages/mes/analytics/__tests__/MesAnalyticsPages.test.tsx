import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

const { tMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'mes.analytics.oeeDashboard.k0': 'OEE 综合仪表盘',
    'mes.mes_oee_dashboard_page.k0': '白班',
    'mes.mes_oee_dashboard_page.k1': '夜班',
    'mes.mes_oee_dashboard_page.k2': '可用率',
    'mes.mes_oee_dashboard_page.k3': '性能率',
    'mes.mes_oee_dashboard_page.k4': '质量率',
    'pages.mes_oee_dashboard_page.k0': '设备',
    'mes.analytics.oeeDashboard.k1': '设备 OEE 排名',
    'mes.mes_oee_dashboard_page.k5': '车间',
    'mes.mes_oee_dashboard_page.k6': '全部车间',
    'mes.mes_oee_dashboard_page.k7': '车间 1',
    'mes.mes_oee_dashboard_page.k8': '车间 2',
    'mes.mes_oee_dashboard_page.k9': 'OEE 指标卡',
    'mes.mes_oee_dashboard_page.k10': 'OEE 趋势',
    'mes.mes_oee_dashboard_page.k11': '设备排名',
    'mes.mes_oee_dashboard_page.k12': '设备名称',

    'mes.mes_delivery_analytics_page.k10': '准时交付分析 Dashboard',

    'mes.mes_quality_pareto_page.pareto_14': '质量缺陷 Pareto 分析',

    'mes.mes_capacity_utilization_page.k21': '产能利用率分析',
    'mes:mes_equipment_mtbf_page.mtbfmttr_3': 'MTBF / MTTR 设备可靠性分析',
    'pages.mes_equipment_mtbf_page.k0': '包装线',
    'pages.mes_equipment_mtbf_page.k1': '装配线',
    'pages.mes_equipment_mtbf_page.k2': '喷涂线',
    'pages.mes_equipment_mtbf_page.k3': '焊接线',
    'pages.mes_equipment_mtbf_page.k4': '机加线',
    'pages.mes_equipment_mtbf_page.k5': '机械故障',
    'pages.mes_equipment_mtbf_page.k6': '电气故障',
    'pages.mes_equipment_mtbf_page.k7': '液压故障',
    'pages.mes_equipment_mtbf_page.k8': '气动故障',
    'pages.mes_equipment_mtbf_page.k9': '传感器故障',
    'pages.mes_equipment_mtbf_page.k10': '控制系统故障',
    'pages.mes_equipment_mtbf_page.k11': '人为操作失误',
    'pages.mes_equipment_mtbf_page.k12': '其他原因',
    'pages.mes_equipment_mtbf_page.k13': '设备类型',
    'pages.mes_equipment_mtbf_page.k14': '全部类型',
    'pages.mes_equipment_mtbf_page.k15': '关键设备',
    'pages.mes_equipment_mtbf_page.k16': '主要设备',
    'pages.mes_equipment_mtbf_page.k17': '一般设备',
    'pages.mes_equipment_mtbf_page.k18': '平均修复时间 MTTR',
    'pages.mes_equipment_mtbf_page.mttr_0': 'MTTR(小时)',
    'mes:mes_equipment_mtbf_page.mtbf12_2': '过去 12 个月 MTBF 趋势',
    'mes:mes_equipment_mtbf_page.mtbfvsoee_1': 'MTBF vs OEE 散点图',
    'pages.mes_equipment_mtbf_page.mttr_19': 'MTTR 分布',
    'pages.mes_equipment_mtbf_page.topn_20': '故障频率 TOP 10',
    'pages.mes_equipment_mtbf_page.k21': '设备名称',
    'pages.mes_equipment_mtbf_page.k22': '故障类型',
    'pages.mes_equipment_mtbf_page.k23': '故障次数',

    'mes.mes_energy_cost_page.k10': '能耗成本分析 Dashboard',
    'mes.mes_energy_cost_page.k0': '车间 6',
    'mes.mes_energy_cost_page.k1': '车间 5',
    'mes.mes_energy_cost_page.k2': '车间 4',
    'mes.mes_energy_cost_page.k3': '车间 3',
    'mes.mes_energy_cost_page.k4': '车间 2',
    'mes.mes_energy_cost_page.k5': '车间 1',
    'mes.mes_energy_cost_page.k6': '电力',
    'mes.mes_energy_cost_page.k7': '天然气',
    'mes.mes_energy_cost_page.k8': '蒸汽',
    'mes.mes_energy_cost_page.k9': '水',
    'pages.mes_energy_cost_page.k0': '电力成本',
    'pages.mes_energy_cost_page.k1': '天然气成本',
    'pages.mes_energy_cost_page.k2': '蒸汽成本',
    'pages.mes_energy_cost_page.k3': '水成本',
    'pages.mes_energy_cost_page.epercentage_0': '能源占比',
    'mes.mes_energy_cost_page.30_16': '近 30 天 能源成本趋势',
    'mes.mes_energy_cost_page.k11': '能源类型',
    'mes.mes_energy_cost_page.k12': '全部能源',
    'mes.mes_energy_cost_page.k13': '电力',
    'mes.mes_energy_cost_page.k14': '天然气',
    'mes.mes_energy_cost_page.k15': '蒸汽',
    'mes.mes_energy_cost_page.k17': '趋势值',
    'mes.mes_energy_cost_page.12_18': '近 12 个月 能耗对比',
    'mes.mes_energy_cost_page.k19': '电力',
    'mes.mes_energy_cost_page.k20': '天然气',
    'mes.mes_energy_cost_page.k21': '蒸汽',
    'mes.mes_energy_cost_page.k22': '水',
    'mes.mes_energy_cost_page.topn_23': '能耗 TOP 5 车间',
    'mes.mes_energy_cost_page.k24': '成本',

    'mes.mes_capacity_utilization_page.k21': '产能利用率分析 Dashboard',
  };

  const tMock = (key: string, options?: Record<string, unknown>): string => {
    let value = i18nMap[key] || key;
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return value;
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
      changeLanguage: vi.fn(),
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

vi.mock('recharts', async () => {
  const React = await import('react');
  const passthrough =
    (name: string) =>
    ({ children, ..._rest }: any) =>
      React.createElement('div', { 'data-testid': name }, children);
  return {
    ResponsiveContainer: passthrough('ResponsiveContainer'),
    LineChart: passthrough('LineChart'),
    Line: passthrough('Line'),
    BarChart: passthrough('BarChart'),
    Bar: passthrough('Bar'),
    PieChart: passthrough('PieChart'),
    Pie: passthrough('Pie'),
    Cell: passthrough('Cell'),
    AreaChart: passthrough('AreaChart'),
    Area: passthrough('Area'),
    ComposedChart: passthrough('ComposedChart'),
    XAxis: passthrough('XAxis'),
    YAxis: passthrough('YAxis'),
    CartesianGrid: passthrough('CartesianGrid'),
    Tooltip: passthrough('Tooltip'),
    Legend: passthrough('Legend'),
    ScatterChart: passthrough('ScatterChart'),
    Scatter: passthrough('Scatter'),
    ZAxis: passthrough('ZAxis'),
    RadialBarChart: passthrough('RadialBarChart'),
    RadialBar: passthrough('RadialBar'),
    PolarAngleAxis: passthrough('PolarAngleAxis'),
    PolarRadiusAxis: passthrough('PolarRadiusAxis'),
    RadarChart: passthrough('RadarChart'),
    PolarGrid: passthrough('PolarGrid'),
    Radar: passthrough('Radar'),
    ReferenceLine: passthrough('ReferenceLine'),
  };
});

describe('MES Analytics Pages', () => {
  it('OEE Dashboard renders title and charts', async () => {
    const { default: Page } = await import('../MesOeeDashboardPage');
    renderWithProviders(<Page />);
    expect(screen.getByText('OEE 综合仪表盘')).toBeInTheDocument();
    expect(screen.getAllByTestId('ResponsiveContainer').length).toBeGreaterThan(0);
  });
});
