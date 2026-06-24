import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import StatusBadge from './StatusBadge';

const meta = {
  title: 'Common/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '统一的状态徽章组件，支持动态颜色映射、图标集成、多种尺寸和变体。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      description: '状态值',
      control: 'select',
      options: [
        'active',
        'inactive',
        'pending',
        'approved',
        'rejected',
        'draft',
        'published',
        'archived',
        'deleted',
        'completed',
        'cancelled',
        'processing',
        'failed',
        'success',
        'warning',
        'error',
        'info',
      ],
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      description: '变体',
      control: 'select',
      options: ['filled', 'outlined', 'soft'],
    },
    showIcon: {
      description: '是否显示图标',
      control: 'boolean',
    },
    clickable: {
      description: '是否可点击',
      control: 'boolean',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'active',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      <StatusBadge status="active" />
      <StatusBadge status="inactive" />
      <StatusBadge status="pending" />
      <StatusBadge status="approved" />
      <StatusBadge status="rejected" />
      <StatusBadge status="draft" />
      <StatusBadge status="published" />
      <StatusBadge status="completed" />
      <StatusBadge status="failed" />
      <StatusBadge status="processing" />
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    status: 'approved',
    showIcon: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <StatusBadge status="active" size="sm" />
      <StatusBadge status="active" size="md" />
      <StatusBadge status="active" size="lg" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      <StatusBadge status="active" variant="filled" />
      <StatusBadge status="active" variant="outlined" />
      <StatusBadge status="active" variant="soft" />
    </div>
  ),
};

export const Clickable: Story = {
  args: {
    status: 'pending',
    clickable: true,
  },
};

export const HRMStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      <StatusBadge status="employee_active" />
      <StatusBadge status="employee_inactive" />
      <StatusBadge status="employee_probation" />
      <StatusBadge status="employee_pending" />
    </div>
  ),
};

export const AttendanceStatuses: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      <StatusBadge status="attendance_normal" />
      <StatusBadge status="attendance_late" />
      <StatusBadge status="attendance_early_leave" />
      <StatusBadge status="attendance_absent" />
      <StatusBadge status="attendance_leave" />
    </div>
  ),
};

export const CustomStatusMap: Story = {
  args: {
    status: 'custom',
    statusMap: {
      custom: {
        label: '自定义状态',
        color: 'success',
        icon: <span>🎉</span>,
      },
    },
  },
};
