import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { QuickSearch } from './QuickSearch';
import type { SearchSuggestion } from './QuickSearch';

const sampleSuggestions: SearchSuggestion[] = [
  { text: '员工管理', icon: 'trending' },
  { text: '考勤记录', icon: 'trending' },
  { text: '薪资报表', icon: 'star' },
  { text: '请假申请', icon: 'recent' },
  { text: '绩效考核', icon: 'history' },
];

const meta = {
  title: 'Common/QuickSearch',
  component: QuickSearch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '快捷搜索组件，支持建议项、历史记录与键盘快捷键，适合全局搜索与命令面板场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      description: '占位符文本',
      control: 'text',
    },
    width: {
      description: '搜索框宽度',
      control: 'number',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
    showSuggestions: {
      description: '是否显示搜索建议',
      control: 'boolean',
    },
    enableShortcut: {
      description: '是否启用键盘快捷键',
      control: 'boolean',
    },
  },
  args: {
    onSearch: fn(),
  },
} satisfies Meta<typeof QuickSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: '搜索功能、页面或数据...',
    width: 500,
  },
};

const WithSuggestions: Story = {
  args: {
    placeholder: '搜索...',
    width: 500,
    suggestions: sampleSuggestions,
  },
};

const NoShortcut: Story = {
  args: {
    placeholder: '搜索...',
    width: 400,
    enableShortcut: false,
  },
};

export const Small: Story = {
  args: {
    placeholder: '搜索...',
    width: 300,
    enableShortcut: false,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: '搜索已禁用',
    width: 400,
    disabled: true,
  },
};

const WithSuggestionsAndHistory: Story = {
  args: {
    placeholder: '全局搜索...',
    width: 500,
    suggestions: [
      { text: '新增员工', icon: 'trending' },
      { text: '部门设置', icon: 'star' },
      { text: '审批流程', icon: 'recent' },
    ],
  },
};
