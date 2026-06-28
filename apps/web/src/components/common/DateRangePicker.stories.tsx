import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DateRangePicker } from './DateRangePicker';

const meta = {
  title: 'Common/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '日期范围选择组件，支持预设快捷选项和自定义日期范围。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showPresets: {
      description: '是否显示预设选项',
      control: 'boolean',
    },
    size: {
      description: '尺寸',
      control: 'select',
      options: ['small', 'medium'],
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
  args: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    onChange: fn(),
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    onChange: fn(),
  },
};

export const SameDay: Story = {
  args: {
    startDate: '2024-06-15',
    endDate: '2024-06-15',
    onChange: fn(),
  },
};

export const MediumSize: Story = {
  args: {
    startDate: '2024-03-01',
    endDate: '2024-06-30',
    size: 'medium',
    onChange: fn(),
  },
};

export const WithoutPresets: Story = {
  args: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    showPresets: false,
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    disabled: true,
    onChange: fn(),
  },
};

export const CustomPresets: Story = {
  args: {
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    customPresets: [
      { id: 'q1', label: '第一季度' },
      { id: 'q2', label: '第二季度' },
      { id: 'q3', label: '第三季度' },
      { id: 'q4', label: '第四季度' },
      { id: 'h1', label: '上半年' },
      { id: 'h2', label: '下半年' },
    ],
    onChange: fn(),
  },
};
