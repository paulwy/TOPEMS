import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ActionButton from './ActionButton';
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

const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      <ActionButton
