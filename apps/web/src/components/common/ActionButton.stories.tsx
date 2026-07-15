import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ActionButton } from './ActionButton';
import { Save, Delete, Plus, Download } from 'lucide-react';

const meta = {
  title: 'Common/ActionButton',
  component: ActionButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '统一操作按钮组件，封装 MUI Button，支持多种变体、加载状态和工具提示。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: '按钮文字',
      control: 'text',
    },
    variant: {
      description: '按钮类型',
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'text'],
    },
    size: {
      description: '按钮尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
    loading: {
      description: '是否加载中',
      control: 'boolean',
    },
    fullWidth: {
      description: '是否全宽',
      control: 'boolean',
    },
    iconPosition: {
      description: '图标位置',
      control: 'select',
      options: ['start', 'end'],
    },
    tooltip: {
      description: '工具提示',
      control: 'text',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof ActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '保存',
    icon: <Save size={18} />,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      <ActionButton
        label='主要操作'
        variant='primary'
        icon={<Plus size={18} />}
      />
      <ActionButton
        label='次要操作'
        variant='secondary'
      />
      <ActionButton
        label='成功'
        variant='success'
        icon={<Save size={18} />}
      />
      <ActionButton
        label='警告'
        variant='warning'
      />
      <ActionButton
        label='删除'
        variant='danger'
        icon={<Delete size={18} />}
      />
      <ActionButton
        label='文本按钮'
        variant='text'
      />
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    label: '导出数据',
    icon: <Download size={18} />,
    iconPosition: 'start',
  },
};

export const IconEnd: Story = {
  args: {
    label: '下一步',
    icon: <Download size={18} />,
    iconPosition: 'end',
  },
};

export const Loading: Story = {
  args: {
    label: '提交中',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    label: '不可用',
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ActionButton
        label='小按钮'
        size='small'
      />
      <ActionButton
        label='中按钮'
        size='medium'
      />
      <ActionButton
        label='大按钮'
        size='large'
      />
    </div>
  ),
};

export const WithTooltip: Story = {
  args: {
    label: '帮助',
    tooltip: '点击获取帮助信息',
    variant = 'text',
  },
};
