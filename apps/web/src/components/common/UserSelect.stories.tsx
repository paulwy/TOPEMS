import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { UserSelect } from './UserSelect';
import type { User } from './UserSelect';

const sampleUsers: User[] = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', department: '研发部' },
  { id: '2', name: '李四', email: 'lisi@example.com', department: '市场部' },
  { id: '3', name: '王五', email: 'wangwu@example.com', department: '财务部' },
  { id: '4', name: '赵六', email: 'zhaoliu@example.com', department: '人力资源部' },
  { id: '5', name: '孙七', email: 'sunqi@example.com', department: '研发部' },
];

const meta = {
  title: 'Common/UserSelect',
  component: UserSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '用户选择组件，支持单选、多选、搜索和头像展示。',
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
    users: sampleUsers,
    onChange: fn(),
  },
} satisfies Meta<typeof UserSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    users: sampleUsers,
    placeholder: '选择用户',
    onChange: fn(),
  },
};

export const WithValue: Story = {
  args: {
    users: sampleUsers,
    value: { id: '1', name: '张三', email: 'zhangsan@example.com', department: '研发部' },
    onChange: fn(),
  },
};

export const Multiple: Story = {
  args: {
    users: sampleUsers,
    multiple: true,
    value: [
      { id: '1', name: '张三', email: 'zhangsan@example.com', department: '研发部' },
      { id: '3', name: '王五', email: 'wangwu@example.com', department: '财务部' },
    ],
    onChange: fn(),
  },
};

export const Loading: Story = {
  args: {
    users: [],
    loading: true,
    onChange: fn(),
  },
};

export const Empty: Story = {
  args: {
    users: [],
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    users: sampleUsers,
    value: { id: '2', name: '李四', email: 'lisi@example.com', department: '市场部' },
    disabled: true,
    onChange: fn(),
  },
};

export const NoClear: Story = {
  args: {
    users: sampleUsers,
    allowClear: false,
    onChange: fn(),
  },
};
