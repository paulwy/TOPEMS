import type { Meta, StoryObj } from '@storybook/react-vite';

import { AreaChart } from './AreaChart';

const meta = {
  title: 'Charts/AreaChart',
  component: AreaChart,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '面积图组件，展示数据趋势与累积量，支持多系列对比，适合趋势叠加分析场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      description: '图表高度',
      control: { type: 'number', min: 100, max: 600 },
    },
    showLegend: {
      description: '是否显示图例',
      control: 'boolean',
    },
    showGrid: {
      description: '是否显示网格线',
      control: 'boolean',
    },
    strokeType: {
      description: '描边类型',
      control: 'select',
      options: ['solid', 'dashed'],
    },
    fillOpacity: {
      description: '填充透明度',
      control: { type: 'number', min: 0, max: 1, step: 0.05 },
    },
    animate: {
      description: '是否启用动画',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof AreaChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const monthlySalesData = [
  { month: '一月', revenue: 4000 },
  { month: '二月', revenue: 3000 },
  { month: '三月', revenue: 5200 },
  { month: '四月', revenue: 4800 },
  { month: '五月', revenue: 6100 },
  { month: '六月', revenue: 5900 },
  { month: '七月', revenue: 7200 },
  { month: '八月', revenue: 6800 },
  { month: '九月', revenue: 7500 },
  { month: '十月', revenue: 8200 },
  { month: '十一月', revenue: 7900 },
  { month: '十二月', revenue: 9100 },
];

const multiSeriesData = [
  { month: '一月', productA: 2000, productB: 1500 },
  { month: '二月', productA: 1800, productB: 1200 },
  { month: '三月', productA: 2800, productB: 2400 },
  { month: '四月', productA: 2500, productB: 2300 },
  { month: '五月', productA: 3200, productB: 2900 },
  { month: '六月', productA: 3000, productB: 2800 },
  { month: '七月', productA: 3800, productB: 3400 },
  { month: '八月', productA: 3500, productB: 3300 },
];

const dailyTrafficData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}日`,
  visits: Math.floor(2000 + Math.sin(i * 0.5) * 800 + Math.random() * 500),
}));

export const Default: Story = {
  args: {
    xKey: 'month',
    yKeys: [{ key: 'revenue', name: '营收（万元）', color: '#5B8FF9' }],
    data: monthlySalesData,
    height: 300,
  },
};

export const MultiSeries: Story = {
  args: {
    xKey: 'month',
    yKeys: [
      { key: 'productA', name: '产品 A', color: '#5B8FF9' },
      { key: 'productB', name: '产品 B', color: '#5AD8A6' },
    ],
    data: multiSeriesData,
    height: 300,
  },
};

const Dashed: Story = {
  args: {
    xKey: 'month',
    yKeys: [{ key: 'revenue', name: '营收（万元）', color: '#E86452' }],
    data: monthlySalesData.slice(0, 8),
    height: 300,
    strokeType: 'dashed',
    fillOpacity: 0.15,
  },
};

const DenseData: Story = {
  args: {
    xKey: 'day',
    yKeys: [{ key: 'visits', name: '日访问量', color: '#6DC8EC' }],
    data: dailyTrafficData,
    height: 350,
    showGrid: false,
  },
};
