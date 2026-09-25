import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { TouchButton } from './TouchButton';

const meta = {
  title: 'Common/TouchButton',
  component: TouchButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '触觉反馈按钮组件，基于 MUI Button 扩展波纹（ripple）反馈，支持全部 Button 属性，适合移动端与强调点击反馈的操作场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { description: '变体', control: 'select', options: ['text', 'outlined', 'contained'] },
    color: {
      description: '颜色',
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error', 'info'],
    },
    size: { description: '尺寸', control: 'select', options: ['small', 'medium', 'large'] },
    disabled: { description: '禁用', control: 'boolean' },
    children: { description: '按钮内容', control: 'text' },
  },
} satisfies Meta<typeof TouchButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <TouchButton {...args}>点击体验波纹反馈</TouchButton>,
  args: { variant: 'contained', onClick: fn() },
};

export const Outlined: Story = {
  render: (args) => <TouchButton {...args}>次级操作</TouchButton>,
  args: { variant: 'outlined', color: 'primary', onClick: fn() },
};

export const Disabled: Story = {
  render: (args) => <TouchButton {...args}>已禁用</TouchButton>,
  args: { variant: 'contained', disabled: true },
};
