import type { Meta, StoryObj } from '@storybook/react-vite';

import RelatedModuleCard from './RelatedModuleCard';

const meta = {
  title: 'Common/RelatedModuleCard',
  component: RelatedModuleCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '关联模块卡片组件，展示模块入口与关键数据项（含趋势），支持跳转链接，适合详情页的关联模块聚合展示。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    moduleCode: { description: '模块标识', control: 'text' },
    moduleName: { description: '模块名称', control: 'text' },
    items: { description: '数据项（label/value/trend/description）', control: false },
    detailPath: { description: '详情跳转路径', control: 'text' },
    linkText: { description: '链接文案', control: 'text' },
    loading: { description: '加载态', control: 'boolean' },
  },
} satisfies Meta<typeof RelatedModuleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const items = [
  { label: '待办', value: 12, trend: 'up' as const, description: '较昨日 +3' },
  { label: '处理中', value: 8 },
  { label: '本月完成', value: 45, trend: 'flat' as const },
];

export const Default: Story = {
  args: {
    moduleCode: 'ticket',
    moduleName: '工单管理',
    items,
    detailPath: '/ticket',
    linkText: '进入模块 →',
  },
};

export const Loading: Story = {
  args: { moduleCode: 'order', moduleName: '订单管理', items: [], loading: true },
};
