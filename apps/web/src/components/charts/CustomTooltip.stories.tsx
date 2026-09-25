import type { Meta, StoryObj } from '@storybook/react-vite';

import CustomTooltip from './CustomTooltip';

const meta = {
  title: 'Charts/CustomTooltip',
  component: CustomTooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '自定义图表 Tooltip 组件，作为 Recharts Tooltip 的 content 使用，支持格式化函数，适合图表数值提示场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    active: { description: '是否激活（由 Recharts 注入）', control: 'boolean' },
    label: { description: 'X 轴标签', control: 'text' },
    formatter: { description: '数值格式化函数', control: false },
    payload: { description: '数据项数组（name/value/color/dataKey）', control: false },
  },
} satisfies Meta<typeof CustomTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const samplePayload = [
  { name: '本月销售额', value: 128400, color: '#1976d2', dataKey: 'sales' },
  { name: '目标值', value: 120000, color: '#9e9e9e', dataKey: 'target' },
];

export const Default: Story = {
  args: { active: true, label: '2026-09', payload: samplePayload },
};

export const Formatted: Story = {
  args: {
    active: true,
    label: '2026-09',
    payload: samplePayload,
    formatter: (value) => [`¥${Number(value).toLocaleString()}`, '金额'],
  },
};
