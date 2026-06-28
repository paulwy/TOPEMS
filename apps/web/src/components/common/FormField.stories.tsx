import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FormField } from './FormField';

const meta = {
  title: 'Common/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '统一的表单字段组件，封装 MUI TextField，提供紧凑尺寸和统一样式。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      description: '字段名称',
      control: 'text',
    },
    label: {
      description: '标签文本',
      control: 'text',
    },
    compact: {
      description: '是否使用紧凑尺寸',
      control: 'boolean',
    },
    size: {
      description: '输入框尺寸',
      control: 'select',
      options: ['small', 'medium'],
    },
    variant: {
      description: '输入框变体',
      control: 'select',
      options: ['outlined', 'filled', 'standard'],
    },
    required: {
      description: '是否必填',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
    error: {
      description: '是否显示错误状态',
      control: 'boolean',
    },
    multiline: {
      description: '是否多行输入',
      control: 'boolean',
    },
    type: {
      description: '输入类型',
      control: 'select',
      options: ['text', 'password', 'number', 'email', 'tel'],
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'username',
    label: '用户名',
    defaultValue: '',
  },
};

export const WithValue: Story = {
  args: {
    name: 'email',
    label: '邮箱地址',
    defaultValue: 'user@example.com',
    type: 'email',
  },
};

export const WithError: Story = {
  args: {
    name: 'password',
    label: '密码',
    type: 'password',
    error: true,
    helperText: '密码长度不能少于8个字符',
    defaultValue: '123',
  },
};

export const Required: Story = {
  args: {
    name: 'phone',
    label: '手机号码',
    required: true,
    helperText: '请输入11位手机号',
    type: 'tel',
  },
};

export const Multiline: Story = {
  args: {
    name: 'description',
    label: '描述信息',
    multiline: true,
    rows: 4,
    defaultValue: '这是一段多行文本内容的示例...',
  },
};

export const Disabled: Story = {
  args: {
    name: 'readonly',
    label: '只读字段',
    disabled: true,
    defaultValue: '不可编辑的内容',
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 300 }}>
      <FormField
        name='small'
        label='紧凑尺寸 (small)'
        compact
        defaultValue='compact field'
      />
      <FormField
        name='medium'
        label='标准尺寸 (medium)'
        compact={false}
        size='medium'
        defaultValue='medium field'
      />
    </div>
  ),
};
