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
        component: '统一的统计卡片组件库，包含 MetricCard（带 Sparkline）、ChartCard（带图表）、StatCardBase 基类。',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const MetricCardBasic: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: '100%' }}>
      <MetricCard
        title='总营收'
        value='1,285,600'
        unit='元'
        change={12.5}
        trend='up'
        icon={<DollarSign size={24} />}
        color='green'
        sparklineData={[40, 55, 48, 62, 58, 72, 68, 85, 80, 92]}
      />
      <MetricCard
        title='订单数'
        value={1284}
        change={8.3}
        trend='up'
        icon={<ShoppingCart size={24} />}
        color='blue'
        sparklineData={[30, 35, 28, 42, 38, 45, 50, 48, 55, 60]}
      />
      <MetricCard
        title='活跃用户'
        value={5680}
        change={-2.1}
        trend='down'
        icon={<Users size={24} />}
        color='purple'
        sparklineData={[60, 58, 55, 52, 50, 48, 52, 55, 50, 48]}
      />
      <MetricCard
        title='转化率'
        value={3.2}
        unit='%'
        change={0.5}
        trend='up'
        icon={<TrendingUp size={24} />}
        color='orange'
        sparklineData={[50, 48, 52, 55, 53, 58, 60, 55, 62, 64]}
        showTargetProgress
        targetProgress={64}
      />
    </Box>
  ),
};

const MetricCardStable: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: '100%' }}>
      <MetricCard
        title='产量'
        value={9850}
        unit='件'
        change={0.2}
        trend='stable'
        icon={<Package size={24} />}
        color='cyan'
      />
      <MetricCard
        title='良品率'
        value={98.5}
        unit='%'
        icon={<Activity size={24} />}
        color='success'
      />
      <MetricCard
        title='待处理'
        value={42}
        change={-15.3}
        trend='down'
        icon={<ShoppingCart size={24} />}
        color='red'
      />
    </Box>
  ),
};

const BaseCard: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: '100%' }}>
      <StatCardBase title='简单指标' value={42} subtitle='无变化率' />
      <StatCardBase title='带后缀' value={128} suffix='万' subtitle='累计' />
      <StatCardBase title='带单位' value={3.5} unit='天' subtitle='平均完成周期' />
    </Box>
  ),
};

const ChartCardPlaceholder: Story = {
  render: () => (
    <ChartCard
      title='营收趋势'
      subtitle='近 12 个月'
      height={300}
      onRefresh={fn()}
      onExport={fn()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
        图表占位内容（实际渲染 ECharts / Recharts）
      </Box>
    </ChartCard>
  ),
};

const ChartCardLoading: Story = {
  render: () => (
    <ChartCard title='销售占比' subtitle='按品类分布' height={300} loading>
      <Box />
    </ChartCard>
  ),
};
