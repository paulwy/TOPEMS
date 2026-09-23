import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import StatCard from '../StatCard';
import AlarmList from '../AlarmList';
import EquipmentStatusPanel from '../EquipmentStatusPanel';
import WorkStationUtilizationCard from '../WorkStationUtilizationCard';
import ProductionGantt from '../ProductionGantt';

const i18nMap = vi.hoisted(
  () =>
    ({
      'pages.stat_card.k0': '较上小时',
      'pages.alarm_list.k0': '实时报警',
      'pages.alarm_list.k1': '当前无报警，运行平稳',
      'pages.alarm_list.k2': '最近 {{count}} 条',
      'pages.equipment_status_panel.k0': '设备运行状态',
      'pages.equipment_status_panel.k1': '合计',
      'pages.equipment_status_panel.k2': '台',
      'pages.equipment_status_panel.k3': '运行 ',
      'pages.equipment_status_panel.k4': '维护 ',
      'pages.equipment_status_panel.k5': '故障 ',
      'pages.work_station_utilization_card.k0': '工站利用率',
      'pages.work_station_utilization_card.k1': '暂无工站数据',
      'pages.work_station_utilization_card.k2': '活跃工单',
      'pages.work_station_utilization_card.k3': '今日产出',
      'pages.production_gantt.k0': '生产进度甘特图',
      'pages.production_gantt.k1': '暂无排产计划',
      'pages.production_gantt.k2': '数量',
      'pages.production_gantt.k3': '状态:',
      'pages.utils.k0': '秒前',
      'pages.utils.k1': '分钟前',
      'pages.utils.k2': '小时前',
      'pages.utils.k3': '天前',
      'mes.constants.k0': '运行中',
      'mes.constants.k1': '使用中',
      'mes.constants.k2': '正常',
      'mes.constants.k3': '空闲',
      'mes.constants.k4': '维护中',
      'mes.constants.k5': '故障',
      'mes.constants.k6': '故障',
      'mes.constants.k7': '已报废',
      'mes.constants.k8': '离线',
      'mes.constants.k9': '严重',
      'mes.constants.k10': '警告',
      'mes.constants.k11': '提示',
      'mes.constants.k12': '待开始',
      'mes.constants.k13': '进行中',
      'mes.constants.k14': '进行中',
      'mes.constants.k15': '已完成',
      'mes.constants.k16': '已暂停',
      'mes.constants.k17': '延期',
    }) as Record<string, string>
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
    i18n: { language: 'zh-CN', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

let tCallCounter: Record<string, number> = {};

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'pages.equipment_status_panel.k0') {
        tCallCounter[key] = (tCallCounter[key] ?? 0) + 1;
        if (tCallCounter[key] === 1) return i18nMap['pages.equipment_status_panel.k0'] ?? key;
        if (tCallCounter[key] === 2) return '合计';
        return '运行 ';
      }
      if (key === 'pages.equipment_status_panel.k1') {
        tCallCounter[key] = (tCallCounter[key] ?? 0) + 1;
        if (tCallCounter[key] === 1) return '台';
        return '维护 ';
      }
      if (key === 'pages.equipment_status_panel.k2') {
        return '故障 ';
      }
      if (options && typeof options === 'object') {
        let result = i18nMap[key] ?? key;
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return i18nMap[key] ?? key;
    },
  },
}));

beforeEach(() => {
  tCallCounter = {};
});

vi.mock('@/components/charts', () => ({
  PieChart: ({ data }: { data: Array<{ name: string; value: number }> }) => (
    <div data-testid='pie-chart'>{data.map((item) => `${item.name}:${item.value}`).join('|')}</div>
  ),
}));

const alarms = [
  {
    id: 'alarm-1',
    level: 'critical' as const,
    source: '产线 A',
    message: '设备温度超过阈值',
    timestamp: '2026-08-11T09:59:30.000Z',
  },
  {
    id: 'alarm-2',
    level: 'warning' as const,
    source: '工位 B',
    message: '节拍低于计划值',
    timestamp: '2026-08-11T09:55:00.000Z',
  },
];

const buckets = [
  { status: 'running', label: '运行中', count: 5, color: '#22c55e' },

  { status: 'maintenance', label: '维护中', count: 2, color: '#f59e0b' },

  { status: 'fault', label: '故障', count: 1, color: '#ef4444' },

  { status: 'idle', label: '空闲', count: 3, color: '#3b82f6' },
];

describe('ProductionDashboard components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('StatCard', () => {
    it('renders title, value, unit and hint', () => {
      renderWithProviders(
        <StatCard
          title='今日产量'
          value={1200}
          unit='件'
          icon={<span data-testid='stat-icon'>I</span>}
          color='primary.main'
          hint='目标 1500 件'
        />
      );

      expect(screen.getByText('今日产量')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument();
      expect(screen.getByText('件')).toBeInTheDocument();
      expect(screen.getByText('目标 1500 件')).toBeInTheDocument();
      expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
    });

    it('renders loading state instead of the value', () => {
      renderWithProviders(
        <StatCard
          title='OEE'
          value='92.5'
          unit='%'
          icon={<span>O</span>}
          color='success.main'
          loading
        />
      );

      expect(screen.getByText('OEE')).toBeInTheDocument();
      expect(screen.queryByText('92.5')).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders a positive delta chip', () => {
      renderWithProviders(
        <StatCard
          title='良品率'
          value='98.6'
          unit='%'
          icon={<span>Q</span>}
          color='success.main'
          delta={2.345}
        />
      );

      expect(screen.getByText('2.3%')).toBeInTheDocument();
      expect(screen.getByText('较上小时')).toBeInTheDocument();
      expect(screen.getByText('2.3%').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
    });

    it('renders a negative delta chip', () => {
      renderWithProviders(
        <StatCard
          title='异常数'
          value={3}
          icon={<span>A</span>}
          color='error.main'
          delta={-1.2}
        />
      );

      expect(screen.getByText('1.2%')).toBeInTheDocument();
      expect(screen.getByText('1.2%').closest('.MuiChip-root')).toHaveClass('MuiChip-colorError');
    });

    it('omits delta when the value is not finite', () => {
      renderWithProviders(
        <StatCard
          title='稼动率'
          value='88'
          icon={<span>U</span>}
          color='info.main'
          delta={Number.NaN}
        />
      );

      expect(screen.queryByText('较上小时')).not.toBeInTheDocument();
    });
  });

  describe('AlarmList', () => {
    it('renders loading state', () => {
      renderWithProviders(
        <AlarmList
          alarms={[]}
          loading
        />
      );

      expect(screen.getByText('实时报警')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders empty alarm state', () => {
      renderWithProviders(<AlarmList alarms={[]} />);

      expect(screen.getByText('当前无报警，运行平稳')).toBeInTheDocument();
      expect(screen.getByText('最近 0 条')).toBeInTheDocument();
    });

    it('renders alarm rows with level labels and relative time', () => {
      renderWithProviders(<AlarmList alarms={alarms} />);

      expect(screen.getByText('严重')).toBeInTheDocument();
      expect(screen.getByText('警告')).toBeInTheDocument();
      expect(screen.getByText('产线 A')).toBeInTheDocument();
      expect(screen.getByText('设备温度超过阈值')).toBeInTheDocument();
      expect(screen.getByText('30 秒前')).toBeInTheDocument();
      expect(screen.getByText('5 分钟前')).toBeInTheDocument();
    });
  });

  describe('EquipmentStatusPanel', () => {
    it('renders loading state', () => {
      renderWithProviders(
        <EquipmentStatusPanel
          buckets={[]}
          total={0}
          loading
        />
      );

      expect(screen.getByText('设备运行状态')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders status summary chips', () => {
      renderWithProviders(
        <EquipmentStatusPanel
          buckets={buckets}
          total={11}
        />
      );

      expect(screen.getByText('合计 11 台')).toBeInTheDocument();
      expect(screen.getByText('运行 5')).toBeInTheDocument();
      expect(screen.getByText('维护 2')).toBeInTheDocument();
      expect(screen.getByText('故障 1')).toBeInTheDocument();
    });

    it('passes bucket data to the pie chart', () => {
      renderWithProviders(
        <EquipmentStatusPanel
          buckets={buckets}
          total={11}
        />
      );

      expect(screen.getByTestId('pie-chart')).toHaveTextContent('运行中:5');
      expect(screen.getByTestId('pie-chart')).toHaveTextContent('维护中:2');
      expect(screen.getByTestId('pie-chart')).toHaveTextContent('故障:1');
      expect(screen.getByTestId('pie-chart')).toHaveTextContent('空闲:3');
    });

    it('falls back to zero counts for missing key statuses', () => {
      renderWithProviders(
        <EquipmentStatusPanel
          buckets={[{ status: 'idle', label: '空闲', count: 3 }]}
          total={3}
        />
      );

      expect(screen.getByText('运行 0')).toBeInTheDocument();
      expect(screen.getByText('维护 0')).toBeInTheDocument();
      expect(screen.getByText('故障 0')).toBeInTheDocument();
    });
  });

  describe('WorkStationUtilizationCard', () => {
    const workstationData = [
      {
        workStation: {
          id: 'ws-1',
          name: '灌装工站',
          code: 'WS-01',
          status: 'running',
        },
        utilization: 0.756,
        activeOrders: 3,
        todayOutput: 120,
      },
      {
        workStation: {
          id: 'ws-2',
          name: '包装工站',
          status: 'idle',
        },
        utilization: 1.2,
        activeOrders: 1,
        todayOutput: 80,
      },
    ];

    it('renders loading state', () => {
      renderWithProviders(
        <WorkStationUtilizationCard
          data={[]}
          loading
        />
      );

      expect(screen.getByText('工站利用率')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders empty state', () => {
      renderWithProviders(<WorkStationUtilizationCard data={[]} />);

      expect(screen.getByText('TOP 0')).toBeInTheDocument();
      expect(screen.getByText('暂无工站数据')).toBeInTheDocument();
    });

    it('renders workstation rows and production metrics', () => {
      renderWithProviders(<WorkStationUtilizationCard data={workstationData} />);

      expect(screen.getByText('TOP 2')).toBeInTheDocument();
      expect(screen.getByText('灌装工站')).toBeInTheDocument();
      expect(screen.getByText('WS-01')).toBeInTheDocument();
      expect(screen.getByText('75.6%')).toBeInTheDocument();
      expect(screen.getByText('活跃工单: 3')).toBeInTheDocument();
      expect(screen.getByText('今日产出: 120')).toBeInTheDocument();
    });

    it('clamps utilization values before formatting', () => {
      renderWithProviders(<WorkStationUtilizationCard data={workstationData} />);

      expect(screen.getByText('包装工站')).toBeInTheDocument();
      expect(screen.getByText('idle')).toBeInTheDocument();
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  describe('ProductionGantt', () => {
    const schedules = [
      {
        id: 'schedule-1',
        order_number: 'MO-001',
        status: 'in_progress',
        quantity: 500,
        planned_start_time: '2026-08-11T09:00:00.000Z',
        planned_end_time: '2026-08-11T11:00:00.000Z',
      },
      {
        id: 'schedule-2',
        order_number: 'MO-002',
        status: 'completed',
        quantity: 300,
        planned_start_time: '2026-08-11T11:30:00.000Z',
        planned_end_time: '2026-08-11T13:00:00.000Z',
      },
    ];

    it('renders loading state', () => {
      renderWithProviders(
        <ProductionGantt
          schedules={[]}
          loading
        />
      );

      expect(screen.getByText('生产进度甘特图')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders empty schedule state', () => {
      renderWithProviders(<ProductionGantt schedules={[]} />);

      expect(screen.getByText('暂无排产计划')).toBeInTheDocument();
    });

    it('renders schedule rows and status labels', () => {
      renderWithProviders(<ProductionGantt schedules={schedules} />);

      expect(screen.getByText('MO-001')).toBeInTheDocument();
      expect(screen.getByText('MO-002')).toBeInTheDocument();
      expect(screen.getByText('进行中 · 500')).toBeInTheDocument();
      expect(screen.getByText('已完成 · 300')).toBeInTheDocument();
    });

    it('renders status legend labels', () => {
      renderWithProviders(<ProductionGantt schedules={schedules} />);

      expect(screen.getByText('待开始')).toBeInTheDocument();
      expect(screen.getAllByText('进行中').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('已完成')).toBeInTheDocument();
      expect(screen.getByText('已暂停')).toBeInTheDocument();
      expect(screen.getByText('延期')).toBeInTheDocument();
    });
  });
});
