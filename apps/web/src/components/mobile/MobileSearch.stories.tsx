import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import MobileSearch from './MobileSearch';

const meta = {
  title: 'Mobile/MobileSearch',
  component: MobileSearch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '移动端搜索组件，支持历史记录展示、点击回填与清空，适合移动端列表页的搜索场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: { description: '占位文案', control: 'text' },
    history: { description: '历史记录列表', control: 'object' },
    onSearch: { description: '搜索回调', control: false },
    onHistoryClick: { description: '点击历史记录回调', control: false },
    onHistoryClear: { description: '清空历史回调', control: false },
  },
} satisfies Meta<typeof MobileSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: 360, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      <MobileSearch {...args} />
    </div>
  ),
  args: {
    placeholder: '搜索工单/客户',
    history: ['TOP-2026-001', '张三', '待审批'],
    onSearch: fn(),
    onHistoryClick: fn(),
    onHistoryClear: fn(),
  },
};

export const NoHistory: Story = {
  render: (args) => (
    <div style={{ width: 360, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
      <MobileSearch {...args} />
    </div>
  ),
  args: { placeholder: '输入关键词', onSearch: fn(), onHistoryClick: fn(), onHistoryClear: fn() },
};
