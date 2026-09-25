import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import MobileLayout from './MobileLayout';

const meta = {
  title: 'Mobile/MobileLayout',
  component: MobileLayout,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '移动端整体布局组件，整合头部导航、内容区与底部标签栏，支持过渡动画与安全区适配，适合移动端页面框架场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { description: '头部标题', control: 'text' },
    showBack: { description: '头部返回按钮', control: 'boolean' },
    showTabBar: { description: '是否显示底部标签栏', control: 'boolean' },
    activeTab: { description: '当前激活标签', control: 'text' },
    bottomPadding: { description: '内容底部留白', control: 'boolean' },
    enableTransition: { description: '启用页面过渡动画', control: 'boolean' },
    safeAreaBottom: { description: '底部安全区适配', control: 'boolean' },
  },
} satisfies Meta<typeof MobileLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const tabs = [
  { id: 'home', label: '首页', icon: '🏠' },
  { id: 'orders', label: '订单', icon: '📋' },
  { id: 'mine', label: '我的', icon: '👤' },
];

export const Default: Story = {
  render: (args) => {
    const [active, setActive] = useState('home');
    return (
      <div
        style={{
          width: 375,
          height: 667,
          border: '1px solid #eee',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <MobileLayout
          {...args}
          tabs={tabs}
          activeTab={active}
          onTabChange={(id) => setActive(id)}
        >
          <div style={{ padding: 16, color: '#666' }}>内容区（可滚动）</div>
        </MobileLayout>
      </div>
    );
  },
  args: { title: '移动工作台', showTabBar: true, bottomPadding: true, onBackClick: fn() },
};

export const WithoutTabBar: Story = {
  render: (args) => (
    <div
      style={{
        width: 375,
        height: 400,
        border: '1px solid #eee',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <MobileLayout {...args}>
        <div style={{ padding: 16, color: '#666' }}>仅头部 + 内容的页面</div>
      </MobileLayout>
    </div>
  ),
  args: { title: '详情页', showBack: true, onBackClick: fn() },
};
