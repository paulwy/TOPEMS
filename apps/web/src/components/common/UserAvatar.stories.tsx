import type { Meta, StoryObj } from '@storybook/react-vite';

import UserAvatar from './UserAvatar';

const meta = {
  title: 'Common/UserAvatar',
  component: UserAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '用户头像组件，支持姓名/邮箱首字生成、图片与 Tooltip 展示，适合列表、详情与评论场景的用户标识。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: { description: '用户姓名（用于生成首字与 Tooltip）', control: 'text' },
    email: { description: '用户邮箱（Tooltip 显示）', control: 'text' },
    src: { description: '头像图片地址（存在时优先显示）', control: 'text' },
    size: { description: '头像尺寸（px）', control: { type: 'number', min: 16, max: 128 } },
    alt: { description: '图片替代文本', control: 'text' },
    showTooltip: { description: '悬停是否显示姓名/邮箱', control: 'boolean' },
  },
} satisfies Meta<typeof UserAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: '张伟', email: 'zhangwei@example.com' },
};

export const WithImage: Story = {
  args: { name: '李娜', src: 'https://i.pravatar.cc/100?img=5', size: 48 },
};

export const WithTooltip: Story = {
  args: { name: '王强', email: 'wangqiang@example.com', showTooltip: true, size: 40 },
};
