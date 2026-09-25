import type { Meta, StoryObj } from '@storybook/react-vite';

import StatusChip from './StatusChip';

const meta = {
  title: 'Common/StatusChip',
  component: StatusChip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '状态芯片组件，将业务状态值映射为带颜色与图标的标签，支持自定义映射与文案，适合列表、详情中的状态标识。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      description: '状态值（由 mapping 映射样式）',
      control: 'select',
      options: [
        'active',
        'inactive',
        'pending',
        'approved',
        'rejected',
        'success',
        'warning',
        'error',
        'info',
      ],
    },
    size: { description: '尺寸', control: 'select', options: ['small', 'medium', 'large'] },
    customLabel: { description: '自定义显示文案', control: 'text' },
    variant: {
      description: '样式变体',
      control: 'select',
      options: ['filled', 'outlined', 'soft'],
    },
    icon: { description: '自定义图标节点', control: false },
  },
} satisfies Meta<typeof StatusChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { status: 'active' },
};

export const AllStatuses: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['active', 'pending', 'approved', 'rejected', 'success', 'warning', 'error', 'info'].map(
        (s) => (
          <StatusChip
            key={s}
            {...args}
            status={s}
          />
        )
      )}
    </div>
  ),
  args: {},
};

export const CustomLabel: Story = {
  args: { status: 'warning', customLabel: '待复核' },
};
