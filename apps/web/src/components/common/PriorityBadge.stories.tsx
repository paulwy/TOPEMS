import type { Meta, StoryObj } from '@storybook/react-vite';

import PriorityBadge from './PriorityBadge';

const meta = {
  title: 'Common/PriorityBadge',
  component: PriorityBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '优先级徽标组件，将优先级值映射为颜色与图标，支持自定义文案与映射，适合工单、任务、审批等场景的优先级标识。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    priority: {
      description: '优先级值（由 mapping 映射样式）',
      control: 'select',
      options: ['low', 'medium', 'high', 'urgent', 'critical'],
    },
    showIcon: { description: '是否显示图标', control: 'boolean' },
    size: { description: '尺寸', control: 'select', options: ['small', 'medium', 'large'] },
    customLabel: { description: '自定义显示文案', control: 'text' },
    customColor: { description: '自定义颜色', control: 'color' },
  },
} satisfies Meta<typeof PriorityBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { priority: 'medium' },
};

export const AllPriorities: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['low', 'medium', 'high', 'urgent', 'critical'].map((p) => (
        <PriorityBadge
          key={p}
          {...args}
          priority={p}
        />
      ))}
    </div>
  ),
  args: { showIcon: true },
};

export const CustomLabel: Story = {
  args: { priority: 'urgent', customLabel: '紧急' },
};
