import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Timeline } from './Timeline';
import { Box, Paper } from '@mui/material';
import type { TimelineItem } from './Timeline';

const meta = {
  title: 'Common/Timeline',
  component: Timeline,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '时间线组件，支持垂直/水平方向、填充/轮廓/柔和变体、多种状态以及加载骨架屏。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      description: '方向',
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
    variant: {
      description: '变体',
      control: 'select',
      options: ['outlined', 'filled', 'soft'],
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    onItemClick: {
      description: '条目点击回调',
      action: 'item clicked',
    },
  },
  args: {
    onItemClick: fn(),
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicItems: TimelineItem[] = [
  {
    id: '1',
    title: '项目创建',
    description: '初始化项目仓库和基础架构',
    time: '2024-01-15 09:00',
    status: 'completed',
  },
  {
    id: '2',
    title: '需求评审',
    description: '完成核心功能需求评审',
    time: '2024-02-01 14:30',
    status: 'completed',
  },
  {
    id: '3',
    title: '开发中',
    description: '正在进行前端页面开发',
    time: '2024-03-10 10:00',
    status: 'active',
  },
  {
    id: '4',
    title: '待测试',
    description: '等待 QA 团队进行功能测试',
    time: '2024-04-01 00:00',
    status: 'pending',
  },
  {
    id: '5',
    title: '待上线',
    description: '测试通过后部署到生产环境',
    status: 'pending',
  },
];

export const Default: Story = {
  args: {
    items: basicItems,
  },
};

export const Horizontal: Story = {
  args: {
    items: basicItems,
    orientation: 'horizontal',
  },
};

export const FilledVariant: Story = {
  args: {
    items: basicItems,
    variant: 'filled',
  },
};

export const SoftVariant: Story = {
  args: {
    items: basicItems,
    variant: 'soft',
  },
};

export const OutlinedVariant: Story = {
  args: {
    items: basicItems,
    variant: 'outlined',
  },
};

export const WithStatuses: Story = {
  args: {
    items: [
      {
        id: '1',
        title: '成功步骤',
        status: 'completed',
        description: '此步骤已完成',
        time: '10:00',
      },
      { id: '2', title: '当前步骤', status: 'active', description: '正在进行中', time: '11:00' },
      { id: '3', title: '等待中', status: 'pending', description: '等待执行', time: '12:00' },
      { id: '4', title: '错误', status: 'error', description: '执行出错', time: '13:00' },
      { id: '5', title: '警告', status: 'warning', description: '需要注意', time: '14:00' },
      { id: '6', title: '信息', status: 'info', description: '参考信息', time: '15:00' },
    ],
  },
};

export const SmallSize: Story = {
  args: {
    items: basicItems.slice(0, 3),
    size: 'small',
  },
};

export const LargeSize: Story = {
  args: {
    items: basicItems.slice(0, 3),
    size: 'large',
  },
};

export const WithContent: Story = {
  args: {
    items: [
      {
        id: '1',
        title: '提交代码',
        description: '向 main 分支提交了更新',
        time: '2024-03-15 10:00',
        status: 'completed',
        content: (
          <Paper
            sx={{ p: 2, mt: 1 }}
            variant='outlined'
          >
            <Box sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              feat: add user authentication module
            </Box>
          </Paper>
        ),
      },
      {
        id: '2',
        title: '代码审查',
        description: '等待团队成员进行代码审查',
        time: '2024-03-15 11:00',
        status: 'active',
      },
    ],
  },
};

export const WithLoading: Story = {
  args: {
    items: [
      { id: '1', title: '已加载步骤', status: 'completed', description: '数据已加载' },
      { id: '2', title: '加载中...', status: 'pending', loading: true },
      { id: '3', title: '待加载', status: 'pending', loading: true },
    ],
  },
};
