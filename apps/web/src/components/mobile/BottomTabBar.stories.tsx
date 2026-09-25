import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import BottomTabBar from './BottomTabBar';

const meta = {
  title: 'Mobile/BottomTabBar',
  component: BottomTabBar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '移动端底部标签栏组件，以配置数组驱动标签渲染，支持徽标数，适合移动端主导航场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: { description: '当前激活标签 id', control: 'text' },
    tabs: { description: '标签配置（id/label/icon/badge）', control: false },
    onChange: { description: '切换回调', control: false },
  },
} satisfies Meta<typeof BottomTabBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const tabs = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'orders', label: '订单', icon: '📋', badge: 3 },
  { id: 'mine', label: '我的', icon: '👤' },
];

export const Default: Story = {
  render: (args) => {
    const [active, setActive] = useState('home');
    return (
      <BottomTabBar
        {...args}
        tabs={tabs}
        activeTab={active}
        onChange={(id) => setActive(id)}
      />
    );
  },
  args: { onChange: fn() },
};

export const WithBadge: Story = {
  args: { tabs, activeTab: 'orders', onChange: fn() },
};
