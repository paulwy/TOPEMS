import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, ButtonGroup } from '@mui/material';

import { MobileButton } from './MobileButton';

const meta = {
  title: 'Mobile/MobileButton',
  component: MobileButton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端按钮组件，基于 MUI Button 适配移动端尺寸，适合移动端操作场景。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '按钮尺寸',
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    variant: {
      description: '按钮变体',
      control: 'select',
      options: ['contained', 'outlined', 'text'],
    },
    color: {
      description: '按钮颜色',
      control: 'select',
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'inherit'],
    },
    fullWidth: {
      description: '是否撑满宽度',
      control: 'boolean',
    },
    disabled: {
      description: '是否禁用',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MobileButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '默认按钮',
  },
};

export const Variants: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 375, margin: '0 auto' }}>
      <MobileButton
        variant='contained'
        color='primary'
      >
