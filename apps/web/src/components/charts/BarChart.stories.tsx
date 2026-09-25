import type { Meta, StoryObj } from '@storybook/react-vite';

import { BarChartComponent } from './BarChart';

const meta = {
  title: 'Charts/BarChart',
  component: BarChartComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '柱状图组件，支持单/多系列柱形展示与标题配置，适合分类数据对比与排行分析。',
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
    barRadius: {
      description: '柱状图圆角',
      control: 'number',
    },
    color: {
      description: '柱状图颜色',
      control: 'text',
    },
  },
} satisfies Meta<typeof BarChartComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

const monthlySalesData = [
  { name: '一月', value: 4000 },
  { name: '二月', value: 3000 },
  { name: '三月', value: 5000 },
  { name: '四月', value: 2780 },
  { name: '五月', value: 1890 },
  { name: '六月', value: 3900 },
  { name: '七月', value: 4800 },
  { name: '八月', value: 3800 },
];

const planVsActualData = [
  { name: '一月', planned: 4000, actual: 3800 },
  { name: '二月', planned: 3000, actual: 3200 },
  { name: '三月', planned: 5000, actual: 4500 },
  { name: '四月', planned: 2780, actual: 2900 },
  { name: '五月', planned: 1890, actual: 2100 },
  { name: '六月', planned: 3900, actual: 3600 },
];

const departmentData = [
  { name: '研发部', value: 120 },
  { name: '市场部', value: 85 },
  { name: '销售部', value: 95 },
  { name: '运营部', value: 65 },
  { name: '财务部', value: 40 },
  { name: '人力资源', value: 30 },
];

export const Default: Story = {
  args: {
    data: monthlySalesData,
    title: '月度销售额',
    height: 300,
  },
};

export const MultiSeries: Story = {
  args: {
    data: planVsActualData,
    title: '计划 vs 实际',
    height: 300,
    yKeys: [
      { key: 'planned', name: '计划', color: '#5B8FF9' },
      { key: 'actual', name: '实际', color: '#5AD8A6' },
    ],
  },
};

export const Compact: Story = {
  args: {
    data: departmentData.slice(0, 4),
    height: 150,
    barRadius: 2,
    title: '各部门人数（紧凑模式）',
  },
};

export const NoTitle: Story = {
  args: {
    data: monthlySalesData.slice(0, 6),
    height: 250,
  },
};
