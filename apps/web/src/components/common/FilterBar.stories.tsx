import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FilterBar } from './FilterBar';
import type { FilterConfig } from './FilterBar';

const meta = {
  title: 'Common/FilterBar',
  component: FilterBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '筛选栏组件，支持多种筛选控件类型（文本、选择、多选、日期、日期范围、数字），可折叠、可重置。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    collapsible: {
      description: '是否可折叠',
      control: 'boolean',
    },
    defaultExpanded: {
      description: '默认展开状态',
      control: 'boolean',
    },
    dense: {
      description: '紧凑模式',
      control: 'boolean',
    },
    variant: {
      description: '输入框变体',
      control: 'select',
      options: ['standard', 'outlined', 'filled'],
    },
  },
  args: {
    onFilterChange: fn(),
    onReset: fn(),
    onSearch: fn(),
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleFilters: FilterConfig[] = [
  {
    id: 'keyword',
    label: '关键词',
    type: 'text',
    placeholder: '请输入关键词',
  },
  {
    id: 'status',
    label: '状态',
    type: 'select',
    options: [
      { label: '待处理', value: 'pending' },
      { label: '进行中', value: 'active' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' },
    ],
  },
  {
    id: 'category',
    label: '分类',
    type: 'select',
    options: [
      { label: '技术', value: 'tech' },
      { label: '产品', value: 'product' },
      { label: '设计', value: 'design' },
      { label: '运营', value: 'operation' },
    ],
  },
  {
    id: 'date',
    label: '创建日期',
    type: 'date',
  },
];

export const Default: Story = {
  args: {
    filters: sampleFilters,
  },
};

export const Collapsed: Story = {
  args: {
    filters: sampleFilters,
    collapsible: true,
    defaultExpanded: false,
  },
};

export const WithActiveFilters: Story = {
  args: {
    filters: sampleFilters.map((f) => {
      if (f.id === 'keyword') return { ...f, value: 'React' };
      if (f.id === 'status') return { ...f, value: 'active' };
      if (f.id === 'category') return { ...f, value: 'tech' };
      return f;
    }),
  },
};

export const Dense: Story = {
  args: {
    filters: sampleFilters,
    dense: true,
  },
};

export const WithMultiselect: Story = {
  args: {
    filters: [
      {
        id: 'keyword',
        label: '关键词',
        type: 'text',
        placeholder: '搜索...',
      },
      {
        id: 'tags',
        label: '标签',
        type: 'multiselect',
        options: [
          { label: '前端', value: 'frontend' },
          { label: '后端', value: 'backend' },
          { label: '移动端', value: 'mobile' },
          { label: '测试', value: 'test' },
          { label: '运维', value: 'devops' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
      },
    ],
  },
};

export const WithDateRange: Story = {
  args: {
    filters: [
      {
        id: 'keyword',
        label: '搜索',
        type: 'text',
        placeholder: '输入搜索内容',
      },
      {
        id: 'dateRange',
        label: '日期范围',
        type: 'dateRange',
      },
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '任务', value: 'task' },
          { label: '缺陷', value: 'bug' },
          { label: '需求', value: 'feature' },
        ],
      },
    ],
  },
};

export const NotCollapsible: Story = {
  args: {
    filters: [
      {
        id: 'name',
        label: '姓名',
        type: 'text',
      },
      {
        id: 'department',
        label: '部门',
        type: 'select',
        options: [
          { label: '技术部', value: 'tech' },
          { label: '产品部', value: 'product' },
          { label: '人力资源', value: 'hr' },
        ],
      },
    ],
    collapsible: false,
  },
};

export const FilledVariant: Story = {
  args: {
    filters: sampleFilters,
    variant: 'filled',
  },
};

export const StandardVariant: Story = {
  args: {
    filters: sampleFilters,
    variant: 'standard',
  },
};
