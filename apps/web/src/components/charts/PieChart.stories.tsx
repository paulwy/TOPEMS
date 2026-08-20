import type { Meta, StoryObj } from '@storybook/react-vite';

import { PieChartComponent } from './PieChart';

const meta = {
  title: 'Charts/PieChart',
  component: PieChartComponent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '饼图组件，支持环形饼图展示，每个数据项可自定义颜色。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: '图表数据，每项包含 name、value 和可选的 color',
      control: 'object',
    },
    title: {
      description: '图表标题',
      control: 'text',
    },
  },
} satisfies Meta<typeof PieChartComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

const marketShareData = [
  { name: '华东区', value: 35 },
  { name: '华南区', value: 25 },
  { name: '华北区', value: 20 },
  { name: '西南区', value: 12 },
  { name: '其他', value: 8 },
];

const deviceTypeData = [
  { name: 'iOS', value: 45, color: '#5B8FF9' },
  { name: 'Android', value: 35, color: '#5AD8A6' },
  { name: 'Windows', value: 12, color: '#F6BD16' },
  { name: 'macOS', value: 8, color: '#E86452' },
];

const orderStatusData = [
  { name: '已完成', value: 120 },
  { name: '进行中', value: 45 },
  { name: '待审核', value: 18 },
  { name: '已取消', value: 8 },
];

export const Default: Story = {
  args: {
    data: marketShareData,
    title: '区域市场份额',
  },
};

const CustomColors: Story = {
  args: {
    data: deviceTypeData,
    title: '设备类型分布',
  },
};

export const Minimal: Story = {
  args: {
    data: orderStatusData,
  },
};

const SmallDataset: Story = {
  args: {
    data: [
      { name: '通过', value: 85 },
      { name: '未通过', value: 15 },
    ],
    title: '质检合格率',
  },
};
