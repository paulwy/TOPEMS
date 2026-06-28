import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FormSelect } from './FormSelect';

const sampleOptions = [
  { value: 'dev', label: '研发部' },
  { value: 'hr', label: '人力资源部' },
  { value: 'finance', label: '财务部' },
  { value: 'marketing', label: '市场部' },
  { value: 'sales', label: '销售部' },
  { value: 'admin', label: '行政部' },
];

const meta = {
  title: 'Common/FormSelect',
  component: FormSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '统一的下拉选择组件，封装 MUI Select，支持单选、多选、清空等功能。',
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
    value: {
      description: '当前值',
      control: 'text',
    },
    multiple: {
      description: '是否多选',
      control: 'boolean',
    },
    required: {
      description: '是否必填',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
    compact: {
      description: '是否紧凑尺寸',
      control: 'boolean',
    },
    allowClear: {
      description: '是否允许清空',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof FormSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'department',
    label: '所属部门',
    options: sampleOptions,
    onChange: fn(),
  },
};

export const WithValue: Story = {
  args: {
    name: 'department',
    label: '所属部门',
    options: sampleOptions,
    value: 'dev',
    onChange: fn(),
  },
};

export const Multiple: Story = {
  args: {
    name: 'departments',
    label: '关联部门',
    options: sampleOptions,
    multiple: true,
    value: ['dev', 'hr'],
    onChange: fn(),
  },
};

export const WithError: Story = {
  args: {
    name: 'role',
    label: '职位角色',
    options: sampleOptions,
    error: '请选择一个部门',
    onChange: fn(),
  },
};

export const WithClear: Story = {
  args: {
    name: 'department',
    label: '所属部门',
    options: sampleOptions,
    value: 'finance',
    allowClear: true,
    placeholder: '请选择部门',
    onChange: fn(),
  },
};

export const Required: Story = {
  args: {
    name: 'department',
    label: '所属部门',
    options: sampleOptions,
    required: true,
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    name: 'department',
    label: '所属部门',
    options: sampleOptions,
    value: 'sales',
    disabled: true,
    onChange: fn(),
  },
};
