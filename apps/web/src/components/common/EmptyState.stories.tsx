import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { EmptyState } from './EmptyState';
import InboxOutlined from '@mui/icons-material/InboxOutlined';

const meta = {
  title: 'Common/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '空状态占位组件，支持图标、文案、操作按钮及多种预设（列表空状态、搜索空状态、权限空状态、错误空状态）。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '标题文案',
      control: 'text',
    },
    description: {
      description: '描述文案',
      control: 'text',
    },
    emoji: {
      description: 'Emoji 图标',
      control: 'text',
    },
    align: {
      description: '对齐方式',
      control: 'select',
      options: ['center', 'left'],
    },
    compact: {
      description: '是否紧凑模式',
      control: 'boolean',
    },
    action: {
      description: '操作按钮配置',
      table: {
        type: { summary: '{ label: string; onClick?: () => void; href?: string }' },
      },
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '暂无数据',
    description: '当前没有可显示的内容，请稍后再试',
    action: {
      label: '添加数据',
      onClick: fn(),
    },
  },
};

const NoAction: Story = {
  args: {
    title: '暂无通知',
    description: '您目前没有任何新通知',
  },
};

export const CustomIcon: Story = {
  args: {
    title: '收件箱为空',
    description: '您还没有收到任何消息',
    icon: <InboxOutlined sx={{ fontSize: 40 }} />,
    action: {
      label: '发送消息',
      onClick: fn(),
    },
  },
};

export const Compact: Story = {
  args: {
    title: '无匹配项',
    description: '没有符合条件的结果',
    compact: true,
    action: {
      label: '清除筛选',
      onClick: fn(),
    },
  },
};

const SearchEmpty: Story = {
  render: () => (
    <EmptyState
      title='未找到与 "React" 相关的结果'
      description='请尝试其他关键词'
      action={{ label: '清除搜索', onClick: fn() }}
    />
  ),
};

const ListEmpty: Story = {
  render: () => (
    <EmptyState
      title='列表为空'
      description='还没有添加任何数据，点击下方按钮开始'
      action={{ label: '立即添加', onClick: fn() }}
    />
  ),
};

const PermissionEmpty: Story = {
  render: () => (
    <EmptyState
      title='无访问权限'
      description='您需要申请权限后才能访问该内容'
      action={{ label: '申请权限', onClick: fn() }}
    />
  ),
};

const ErrorEmpty: Story = {
  render: () => (
    <EmptyState
      title='加载失败'
      description='网络连接超时，请检查网络后重试'
      action={{ label: '重试', onClick: fn() }}
    />
  ),
};

const EmojiVariant: Story = {
  args: {
    title: '做得好！',
    description: '所有任务已完成',
    emoji: '🎉',
  },
};

const LeftAligned: Story = {
  args: {
    title: '左侧对齐的空状态',
    description: '这是一个左对齐的空状态示例',
    align: 'left',
    emoji: '📁',
    action: {
      label: '上传文件',
      onClick: fn(),
    },
  },
};
