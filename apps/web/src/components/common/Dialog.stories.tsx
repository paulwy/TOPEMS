import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Dialog } from './Dialog';
import { Typography } from '@mui/material';

const meta = {
  title: 'Common/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '统一对话框组件，支持自定义标题、内容、操作按钮和多种尺寸。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      description: '是否打开',
      control: 'boolean',
    },
    title: {
      description: '标题',
      control: 'text',
    },
    maxWidth: {
      description: '最大宽度',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', false],
    },
    fullWidth: {
      description: '是否全宽',
      control: 'boolean',
    },
    showCloseButton: {
      description: '是否显示关闭按钮',
      control: 'boolean',
    },
    closable: {
      description: '是否可关闭',
      control: 'boolean',
    },
    closeOnBackdropClick: {
      description: '点击外部是否关闭',
      control: 'boolean',
    },
    centered: {
      description: '是否居中显示',
      control: 'boolean',
    },
    showDivider: {
      description: '是否显示分隔线',
      control: 'boolean',
    },
  },
  args: {
    open: true,
    onClose: fn(),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: '提示',
    children: <Typography>这是一个基础对话框示例。</Typography>,
  },
};

const WithActions: Story = {
  args: {
    open: true,
    title: '确认操作',
    children: <Typography>确定要执行此操作吗？此操作不可撤销。</Typography>,
    confirmButton: {
      label: '确认',
      onClick: fn(),
    },
    cancelButton: {
      label: '取消',
      onClick: fn(),
    },
  },
};

const LargeContent: Story = {
  args: {
    open: true,
    title: '用户详情',
    maxWidth: 'md',
    children: (
      <div style={{ minHeight: 300 }}>
        <Typography paragraph>姓名：张三</Typography>
        <Typography paragraph>部门：研发部</Typography>
        <Typography paragraph>职位：前端工程师</Typography>
        <Typography paragraph>入职日期：2024-01-15</Typography>
        <Typography paragraph>邮箱：zhangsan@example.com</Typography>
      </div>
    ),
    confirmButton: {
      label: '关闭',
      onClick: fn(),
    },
  },
};

const DangerConfirm: Story = {
  args: {
    open: true,
    title: '删除确认',
    children: <Typography>确定要删除该记录吗？删除后将无法恢复。</Typography>,
    confirmButton: {
      label: '确认删除',
      onClick: fn(),
      color: 'error',
    },
    cancelButton: {
      label: '取消',
      onClick: fn(),
    },
    showDivider: true,
  },
};

const Centered: Story = {
  args: {
    open: true,
    title: '居中对话框',
    centered: true,
    children: <Typography>该对话框垂直居中显示。</Typography>,
    confirmButton: {
      label: '知道了',
      onClick: fn(),
    },
  },
};

const LoadingConfirm: Story = {
  args: {
    open: true,
    title: '提交确认',
    children: <Typography>正在提交数据，请稍候...</Typography>,
    confirmButton: {
      label: '提交',
      onClick: fn(),
      loading: true,
    },
    cancelButton: {
      label: '取消',
      onClick: fn(),
    },
  },
};
