import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DepartmentSelect } from './DepartmentSelect';
import type { Department } from './DepartmentSelect';

const sampleDepartments: Department[] = [
  {
    id: '1',
    name: '总公司',
    children: [
      {
        id: '1-1',
        name: '研发中心',
        children: [
          { id: '1-1-1', name: '前端组' },
          { id: '1-1-2', name: '后端组' },
          { id: '1-1-3', name: '测试组' },
        ],
      },
      { id: '1-2', name: '市场部' },
      { id: '1-3', name: '财务部' },
      { id: '1-4', name: '人力资源部' },
    ],
  },
];

const meta = {
  title: 'Common/DepartmentSelect',
  component: DepartmentSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '部门选择组件，支持树形结构展示、搜索和多选。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      description: '占位符文本',
      control: 'text',
    },
    multiple: {
      description: '是否多选',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
    loading: {
      description: '是否加载中',
      control: 'boolean',
    },
    allowClear: {
      description: '是否允许清空',
      control: 'boolean',
    },
  },
  args: {
    departments: sampleDepartments,
    onChange: fn(),
  },
} satisfies Meta<typeof DepartmentSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    departments: sampleDepartments,
    placeholder: '选择部门',
    onChange: fn(),
  },
};

export const WithValue: Story = {
  args: {
    departments: sampleDepartments,
    value: { id: '1-1', name: '研发中心' },
    onChange: fn(),
  },
};

export const Multiple: Story = {
  args: {
    departments: sampleDepartments,
    multiple: true,
    value: [
      { id: '1-1', name: '研发中心' },
      { id: '1-2', name: '市场部' },
    ],
    onChange: fn(),
  },
};

export const FlatDepartments: Story = {
  args: {
    departments: [
      { id: '1', name: '研发部' },
      { id: '2', name: '市场部' },
      { id: '3', name: '财务部' },
      { id: '4', name: '行政部' },
    ],
    onChange: fn(),
  },
};

export const Loading: Story = {
  args: {
    departments: [],
    loading: true,
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    departments: sampleDepartments,
    value: { id: '1-1-1', name: '前端组' },
    disabled: true,
    onChange: fn(),
  },
};

export const Empty: Story = {
  args: {
    departments: [],
    onChange: fn(),
  },
};
