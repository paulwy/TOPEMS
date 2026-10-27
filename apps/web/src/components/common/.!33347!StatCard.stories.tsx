import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Box } from '@mui/material';
import { DollarSign, ShoppingCart, Users, TrendingUp, Activity, Package } from 'lucide-react';
import { MetricCard, ChartCard, StatCardBase } from './StatCard';

const meta = {
  title: 'Common/StatCard',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '统一的统计卡片组件库，包含 MetricCard（带 Sparkline）、ChartCard（带图表）、StatCardBase 基类。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MetricCardBasic: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: '100%' }}>
      <MetricCard
