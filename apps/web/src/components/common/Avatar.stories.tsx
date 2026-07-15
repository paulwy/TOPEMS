import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Avatar, AvatarGroup } from './Avatar';
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

export const WithImage: Story = {
  args: {
    name: '张三',
    src: 'https://i.pravatar.cc/150?img=1',
  },
};

export const StatusOnline: Story = {
  args: {
    name: '张三',
    status: 'online',
  },
};

export const StatusOffline: Story = {
  args: {
    name: '李四',
    status: 'offline',
  },
};

export const StatusBusy: Story = {
  args: {
    name: '王五',
    status: 'busy',
  },
};

export const StatusAway: Story = {
  args: {
    name: '赵六',
    status: 'away',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <Avatar
        name='在线'
        status='online'
      />
      <Avatar
        name='离线'
        status='offline'
      />
      <Avatar
        name='忙碌'
        status='busy'
      />
      <Avatar
        name='离开'
        status='away'
      />
    </Box>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Avatar
        name='超小'
        size='xs'
      />
      <Avatar
        name='小号'
        size='sm'
      />
      <Avatar
        name='中号'
        size='md'
      />
      <Avatar
        name='大号'
        size='lg'
      />
      <Avatar
        name='超大'
        size='xl'
      />
    </Box>
  ),
};

export const AvatarGroupDefault: Story = {
  render: () => (
    <AvatarGroup
      avatars={[
        { name: '张三', src: 'https://i.pravatar.cc/150?img=1' },
        { name: '李四', src: 'https://i.pravatar.cc/150?img=2' },
        { name: '王五', src: 'https://i.pravatar.cc/150?img=3' },
        { name: '赵六', src: 'https://i.pravatar.cc/150?img=4' },
        { name: '钱七', src: 'https://i.pravatar.cc/150?img=5' },
        { name: '孙八', src: 'https://i.pravatar.cc/150?img=6' },
        { name: '周九', src: 'https://i.pravatar.cc/150?img=7' },
      ]}
      max={5}
    />
  ),
};

export const AvatarGroupSmall: Story = {
  render: () => (
    <AvatarGroup
      avatars={[{ name: '张三' }, { name: '李四' }, { name: '王五' }, { name: '赵六' }]}
      size='sm'
      max={3}
    />
  ),
};

export const WithBadge: Story = {
  args: {
    name: '张三',
    badge: 5,
  },
};

export const WithBadgeString: Story = {
  args: {
    name: '张三',
    badge: '新',
    badgeColor: 'warning',
  },
};

export const WithBadgeError: Story = {
  args: {
    name: '张三',
    badge: 99,
    badgeColor: 'error',
  },
};

export const WithStatusAndBadge: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      <Avatar
        name='张三'
        status='online'
        badge={3}
      />
      <Avatar
        name='李四'
        status='busy'
        badge={12}
        badgeColor='warning'
      />
    </Box>
  ),
};

export const SquareVariant: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Avatar
        name='方形'
        variant='square'
      />
      <Avatar
        name='圆角'
        variant='rounded'
      />
      <Avatar
        name='圆形'
        variant='circular'
      />
    </Box>
  ),
};

export const CustomColor: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Avatar
        name='红'
        color='error'
      />
      <Avatar
        name='绿'
        color='success'
      />
      <Avatar
        name='蓝'
        color='info'
      />
      <Avatar
        name='橙'
        color='warning'
      />
    </Box>
  ),
};
