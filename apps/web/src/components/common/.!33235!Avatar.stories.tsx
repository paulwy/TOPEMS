import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Avatar } from './Avatar';
import { Box } from '@mui/material';

const meta = {
  title: 'Common/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '头像组件，支持姓名首字母、图片源、状态指示器、徽章数字、多种尺寸和变体，以及头像分组。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      description: '姓名（用于生成首字母）',
      control: 'text',
    },
    src: {
      description: '图片地址',
      control: 'text',
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    variant: {
      description: '形状变体',
      control: 'select',
      options: ['circular', 'rounded', 'square'],
    },
    status: {
      description: '在线状态',
      control: 'select',
      options: ['online', 'offline', 'busy', 'away', undefined],
    },
    badge: {
      description: '徽章数字或文字',
      control: 'text',
    },
    badgeColor: {
      description: '徽章颜色',
      control: 'select',
      options: ['primary', 'secondary', 'error', 'warning', 'success', 'info'],
    },
    color: {
      description: '头像背景色主题',
      control: 'text',
    },
    onClick: {
      description: '点击回调',
      action: 'clicked',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: '张三',
  },
};

const WithImage: Story = {
  args: {
    name: '张三',
    src: 'https://i.pravatar.cc/150?img=1',
  },
};

const StatusOnline: Story = {
  args: {
    name: '张三',
    status: 'online',
  },
};

const StatusOffline: Story = {
  args: {
    name: '李四',
    status: 'offline',
  },
};

const StatusBusy: Story = {
  args: {
    name: '王五',
    status: 'busy',
  },
};

const StatusAway: Story = {
  args: {
    name: '赵六',
    status: 'away',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <Avatar
