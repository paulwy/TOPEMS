import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Plus,
  FileText,
  Download,
  Settings,
  ClipboardList,
} from 'lucide-react';

import { DashboardTemplate } from './DashboardTemplate';
import type { StatCard, ChartCard, RecentItem, QuickAction } from './DashboardTemplate';
import { designTokens } from '@topems/tokens';

const meta = {
  title: 'Templates/DashboardTemplate',
  component: DashboardTemplate,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '仪表盘模板，提供统计卡片、图表卡片、最近事项和快捷操作的完整仪表盘布局。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockStats: StatCard[] = [
  {
    id: 'revenue',
    title: '总营收',
    value: '1,285,600',
    unit: '元',
    change: 12.5,
    changeLabel: '较上月',
    icon: <DollarSign style={{ width: 24, height: 24 }} />,
    color: 'primary',
    trend: [40, 55, 48, 62, 58, 72, 68, 85, 80, 92],
  },
  {
    id: 'orders',
    title: '订单数',
    value: 1284,
    change: 8.3,
    changeLabel: '较上月',
    icon: <ShoppingCart style={{ width: 24, height: 24 }} />,
    color: 'success',
    trend: [30, 35, 28, 42, 38, 45, 50, 48, 55, 60],
  },
  {
    id: 'users',
    title: '活跃用户',
    value: 5680,
    change: -2.1,
    changeLabel: '较上月',
    icon: <Users style={{ width: 24, height: 24 }} />,
    color: 'info',
    trend: [60, 58, 55, 52, 50, 48, 52, 55, 50, 48],
  },
  {
    id: 'conversion',
    title: '转化率',
    value: 3.2,
    unit: '%',
    change: 0.5,
    changeLabel: '较上月',
    icon: <TrendingUp style={{ width: 24, height: 24 }} />,
    color: 'warning',
    progress: 64,
    progressLabel: '目标进度',
  },
];

const mockCharts: ChartCard[] = [
  {
    id: 'revenue-chart',
    title: '营收趋势',
    subtitle: '近 12 个月',
    type: 'line',
    height: 350,
    chart: (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color='text.secondary'>营收趋势图（示例占位）</Typography>
      </Box>
    ),
    onRefresh: () => {},
    onDownload: () => {},
  },
  {
    id: 'sales-chart',
    title: '产品销售占比',
    subtitle: '按品类分布',
    type: 'pie',
    height: 350,
    chart: (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color='text.secondary'>产品销售占比图（示例占位）</Typography>
      </Box>
    ),
    onRefresh: () => {},
    onDownload: () => {},
  },
];

const mockRecentItems: RecentItem[] = [
  {
    id: '1',
    title: '生产工单 #WO-0891 已完成',
    description: '精密轴承 A-200 生产完成，产量 500 件',
    time: '10 分钟前',
    status: 'success',
    icon: <Package style={{ width: 16, height: 16 }} />,
  },
  {
    id: '2',
    title: '采购申请 #PR-0156 待审批',
    description: '供应商: 华东材料 | 金额: 52,800 元',
    time: '30 分钟前',
    status: 'warning',
    icon: <ClipboardList style={{ width: 16, height: 16 }} />,
  },
  {
    id: '3',
    title: '质检报告异常告警',
    description: '产品 B-150 不合格率超过阈值 (3.2%)',
    time: '1 小时前',
    status: 'error',
    icon: <FileText style={{ width: 16, height: 16 }} />,
  },
  {
    id: '4',
    title: '新员工入职办理',
    description: '陈十三 已完成入职手续，分配至研发部',
    time: '2 小时前',
    status: 'info',
    icon: <Users style={{ width: 16, height: 16 }} />,
  },
  {
    id: '5',
    title: '设备维护计划已创建',
    description: '数控机床 A01 定期维护，安排在下周三',
    time: '3 小时前',
    status: 'default',
  },
];

const mockQuickActions: QuickAction[] = [
  {
    id: 'create-order',
    label: '创建工单',
    icon: <Plus style={{ width: 20, height: 20 }} />,
    description: '创建新的生产工单',
    color: designTokens.colors.primary[700],
  },
  {
    id: 'add-product',
    label: '添加产品',
    icon: <Package style={{ width: 20, height: 20 }} />,
    description: '录入新的产品信息',
    color: '#2e7d32',
  },
  {
    id: 'export-report',
    label: '导出报表',
    icon: <Download style={{ width: 20, height: 20 }} />,
    description: '导出业务数据报表',
    color: designTokens.colors.warning[500],
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <Settings style={{ width: 20, height: 20 }} />,
    description: '配置系统参数',
    color: designTokens.colors.secondary[700],
    badge: 2,
  },
];

export const Default: Story = {
  args: {
    title: '运营仪表盘',
    subtitle: '数据概览与管理',
    stats: mockStats,
    charts: mockCharts,
    recentItems: mockRecentItems,
    recentTitle: '最近动态',
    quickActions: mockQuickActions,
    quickActionsTitle: '快捷操作',
    onRefresh: () => {},
  },
};

export const Loading: Story = {
  args: {
    title: '运营仪表盘',
    stats: mockStats,
    charts: mockCharts,
    loading: true,
  },
};

export const StatsOnly: Story = {
  args: {
    title: '关键指标概览',
    stats: mockStats,
  },
};

export const StatsWithProgress: Story = {
  args: {
    title: '生产进度看板',
    stats: [
      {
        id: 'plan',
        title: '计划产量',
        value: 10000,
        unit: '件',
        progress: 78,
        progressLabel: '完成进度',
        icon: <Package style={{ width: 24, height: 24 }} />,
        color: 'primary',
      },
      {
        id: 'quality',
        title: '合格率',
        value: 98.5,
        unit: '%',
        progress: 98.5,
        progressLabel: '质量达标',
        icon: <TrendingUp style={{ width: 24, height: 24 }} />,
        color: 'success',
      },
      {
        id: 'efficiency',
        title: '设备效率',
        value: 85.2,
        unit: '%',
        progress: 85,
        progressLabel: '效率目标: 90%',
        icon: <Settings style={{ width: 24, height: 24 }} />,
        color: 'warning',
      },
      {
        id: 'safety',
        title: '安全生产天数',
        value: 365,
        unit: '天',
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'info',
        tags: [{ label: '连续达标', color: '#2e7d32' }],
      },
    ],
  },
};
