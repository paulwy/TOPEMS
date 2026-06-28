import type { Meta, StoryObj } from '@storybook/react-vite';

import { MobileSkeleton } from './MobileSkeleton';

const meta = {
  title: 'Mobile/MobileSkeleton',
  component: MobileSkeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端骨架屏组件，提供列表、卡片、详情页和仪表盘四种预加载占位形态。',
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

export const ListWithoutAvatar: Story = {
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
