import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Chip } from '@mui/material';
import { FileText, Bell, Settings } from 'lucide-react';

import { MobileCard } from './MobileCard';

const meta = {
  title: 'Mobile/MobileCard',
  component: MobileCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: '移动端卡片组件，支持标题、副标题、图标、徽标与点击事件，适合移动端列表展示。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '卡片标题',
      control: 'text',
    },
    subtitle: {
      description: '卡片副标题',
      control: 'text',
    },
    showArrow: {
      description: '是否显示右侧箭头',
      control: 'boolean',
    },
    divider: {
      description: '是否显示底部边框',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MobileCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box sx={{ maxWidth: 375, margin: '0 auto' }}>
      <MobileCard
