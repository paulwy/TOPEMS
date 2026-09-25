import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import MobileHeader from './MobileHeader';

const meta = {
  title: 'Mobile/MobileHeader',
  component: MobileHeader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '移动端头部导航组件，支持返回、菜单、通知、搜索与更多入口，适合移动端页面的顶部导航场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { description: '标题', control: 'text' },
    showBack: { description: '显示返回按钮', control: 'boolean' },
    showMenu: { description: '显示菜单按钮', control: 'boolean' },
    showNotifications: { description: '显示通知按钮', control: 'boolean' },
    showSearch: { description: '显示搜索按钮', control: 'boolean' },
    showMore: { description: '显示更多按钮', control: 'boolean' },
    notificationCount: { description: '通知徽标数', control: 'number' },
  },
} satisfies Meta<typeof MobileHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: '工作台', showBack: true, onBackClick: fn() },
};

export const FullActions: Story = {
  args: {
    title: '消息中心',
    showBack: true,
    showNotifications: true,
    showSearch: true,
    showMore: true,
    notificationCount: 5,
    onBackClick: fn(),
  },
};

export const Plain: Story = {
  args: { title: '我的' },
};
