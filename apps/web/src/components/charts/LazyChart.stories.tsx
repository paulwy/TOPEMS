import type { Meta, StoryObj } from '@storybook/react-vite';

import LazyChart from './LazyChart';

const meta = {
  title: 'Charts/LazyChart',
  component: LazyChart,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '懒加载图表组件，按类型（柱/线/饼/面积/雷达）动态加载对应图表，适合需要代码分割与按需渲染的图表场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: '图表类型',
      control: 'select',
      options: ['bar', 'line', 'pie', 'area', 'radar'],
    },
    data: { description: '图表数据', control: 'object' },
    title: { description: '标题', control: 'text' },
    height: { description: '高度（px）', control: 'number' },
  },
} satisfies Meta<typeof LazyChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const barData = [
  { month: '1月', value: 120 },
  { month: '2月', value: 180 },
  { month: '3月', value: 150 },
  { month: '4月', value: 220 },
];

export const BarChart: Story = {
  args: { type: 'bar', data: barData, title: '月度销量', height: 280 },
};

export const PieChart: Story = {
  args: {
    type: 'pie',
    data: [
      { name: '待办', value: 12 },
      { name: '处理中', value: 8 },
      { name: '已完成', value: 45 },
    ],
    title: '工单状态分布',
    height: 280,
  },
};
