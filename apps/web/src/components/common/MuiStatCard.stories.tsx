import type { Meta, StoryObj } from '@storybook/react-vite';

import MuiStatCard from './MuiStatCard';

const meta = {
  title: 'Common/MuiStatCard',
  component: MuiStatCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '统计指标卡片组件，支持数值、单位、环比变化与图标，可配渐变与点击，适合仪表盘指标展示场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { description: '指标名称', control: 'text' },
    value: { description: '指标数值', control: 'text' },
    unit: { description: '单位', control: 'text' },
    change: { description: '变化值（如 12.5%）', control: 'text' },
    changeLabel: { description: '变化说明（如 较上周）', control: 'text' },
    changeDirection: {
      description: '变化方向',
      control: 'select',
      options: ['up', 'down', 'flat'],
    },
    color: { description: '主题色', control: 'color' },
    gradient: { description: '是否启用渐变', control: 'boolean' },
    icon: { description: '图标节点', control: false },
    loading: { description: '加载态', control: 'boolean' },
  },
} satisfies Meta<typeof MuiStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '今日订单',
    value: '1,284',
    unit: '单',
    change: '+12.5%',
    changeDirection: 'up',
    changeLabel: '较昨日',
  },
};

export const DownTrend: Story = {
  args: {
    title: '库存周转',
    value: '86.4',
    unit: '%',
    change: '-3.2%',
    changeDirection: 'down',
    changeLabel: '较上周',
  },
};

export const LoadingState: Story = {
  args: { title: '实时销售额', value: '—', loading: true },
};
