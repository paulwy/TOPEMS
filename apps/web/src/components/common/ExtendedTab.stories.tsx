import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import ExtendedTab from './ExtendedTab';

const meta = {
  title: 'Common/ExtendedTab',
  component: ExtendedTab,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '扩展标签页组件，以配置数组驱动标签渲染，支持图标与受控切换，适合多页签内容布局场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: { description: '当前选中值', control: 'text' },
    configs: { description: '标签配置（moduleCode/label/icon/value）', control: false },
    onChange: { description: '切换回调', control: false },
  },
} satisfies Meta<typeof ExtendedTab>;

export default meta;
type Story = StoryObj<typeof meta>;

const configs = [
  { moduleCode: 'overview', label: '总览', value: 'overview' },
  { moduleCode: 'detail', label: '明细', value: 'detail' },
  { moduleCode: 'history', label: '历史', value: 'history' },
  { moduleCode: 'settings', label: '设置', value: 'settings' },
];

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState('overview');
    return (
      <ExtendedTab
        {...args}
        value={value}
        onChange={(v) => setValue(v as string)}
      />
    );
  },
  args: { configs, onChange: fn() },
};

export const ActiveSecond: Story = {
  args: { configs, value: 'detail', onChange: fn() },
};
