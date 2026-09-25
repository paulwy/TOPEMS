import type { Meta, StoryObj } from '@storybook/react-vite';

import { MobileSkeleton } from './MobileSkeleton';

const meta = {
  title: 'Mobile/MobileSkeleton',
  component: MobileSkeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端骨架屏组件，按类型生成占位区块，支持数量与头像配置，适合移动端加载场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: '骨架屏类型',
      control: 'select',
      options: ['list', 'card', 'detail', 'dashboard'],
    },
    count: {
      description: '骨架条目数量',
      control: { type: 'number', min: 1, max: 10 },
    },
    avatar: {
      description: '是否显示头像占位（仅列表类型有效）',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MobileSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: {
    type: 'list',
    count: 5,
  },
};

const ListWithoutAvatar: Story = {
  args: {
    type: 'list',
    count: 6,
    avatar: false,
  },
};

export const Card: Story = {
  args: {
    type: 'card',
    count: 4,
  },
};

export const Detail: Story = {
  args: {
    type: 'detail',
    count: 4,
  },
};

export const Dashboard: Story = {
  args: {
    type: 'dashboard',
  },
};
