import type { Meta, StoryObj } from '@storybook/react-vite';

import { LineChartComponent } from './LineChart';

const meta = {
  title: 'Charts/LineChart',
  component: LineChartComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '折线图组件，支持单系列和多系列数据展示，适合趋势数据可视化。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: '图表数据',
      control: 'object',
    },
    title: {
      description: '图表标题',
      control: 'text',
    },
    xKey: {
      description: 'X 轴数据字段',
      control: 'text',
    },
    yKey: {
      description: 'Y 轴数据字段（单系列时使用）',
      control: 'text',
    },
    height: {
      description: '图表高度',
      control: { type: 'number', min: 100, max: 600 },
    },
    color: {
      description: '折线颜色',
      control: 'text',
    },
  },
} satisfies Meta<typeof LineChartComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

const revenueTrendData = [
  { name: '一月', value: 4000 },
  { name: '二月', value: 3000 },
  { name: '三月', value: 5200 },
  { name: '四月', value: 4800 },
  { name: '五月', value: 6100 },
  { name: '六月', value: 5900 },
  { name: '七月', value: 7200 },
  { name: '八月', value: 6800 },
  { name: '九月', value: 7500 },
  { name: '十月', value: 8200 },
  { name: '十一月', value: 7900 },
  { name: '十二月', value: 9100 },
];

const ordersVsVisitorsData = [
  { name: '一月', orders: 320, visitors: 5800 },
  { name: '二月', orders: 280, visitors: 5200 },
  { name: '三月', orders: 450, visitors: 7200 },
  { name: '四月', orders: 390, visitors: 6500 },
  { name: '五月', orders: 520, visitors: 8100 },
  { name: '六月', orders: 480, visitors: 7800 },
  { name: '七月', orders: 610, visitors: 9200 },
  { name: '八月', orders: 550, visitors: 8500 },
];

const temperatureData = [
  { name: '00:00', value: 22 },
  { name: '03:00', value: 19 },
  { name: '06:00', value: 20 },
  { name: '09:00', value: 25 },
  { name: '12:00', value: 32 },
  { name: '15:00', value: 35 },
  { name: '18:00', value: 30 },
  { name: '21:00', value: 26 },
];

export const Default: Story = {
  args: {
    data: revenueTrendData,
    title: '年度营收趋势',
    height: 300,
  },
};

export const MultiSeries: Story = {
  args: {
    data: ordersVsVisitorsData,
    title: '订单量 vs 访客量',
    height: 300,
    yKeys: [
      { key: 'orders', name: '订单量', color: '#5B8FF9' },
      { key: 'visitors', name: '访客量', color: '#F6BD16' },
    ],
  },
};

export const Compact: Story = {
  args: {
    data: temperatureData,
    title: '今日温度变化（紧凑模式）',
    height: 150,
  },
};

export const NoTitle: Story = {
  args: {
    data: revenueTrendData.slice(0, 6),
    height: 250,
    color: '#E86452',
  },
};
