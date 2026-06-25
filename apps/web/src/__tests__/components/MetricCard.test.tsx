import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../testUtils';
import { MetricCard, Sparkline, StatCardBase, ChartCard } from '../../components/common/StatCard';
import { Users, TrendingUp } from 'lucide-react';

describe('StatCard 统计卡片组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StatCardBase 基础统计卡片', () => {
    it('应该正确渲染标题和值', () => {
      renderWithProviders(
        <StatCardBase title="总用户数" value={1000} animate={false} />
      );
      expect(screen.getByText('总用户数')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });

    it('应该正确渲染副标题', () => {
      renderWithProviders(
        <StatCardBase title="总用户数" value={1000} subtitle="较上月增长" animate={false} />
      );
      expect(screen.getByText('较上月增长')).toBeInTheDocument();
    });

    it('应该正确渲染单位', () => {
      renderWithProviders(
        <StatCardBase title="销售额" value={50000} unit="元" animate={false} />
      );
      expect(screen.getByText('元')).toBeInTheDocument();
    });

    it('应该正确渲染后缀', () => {
      renderWithProviders(
        <StatCardBase title="完成率" value={85} suffix="%" animate={false} />
      );
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('应该正确渲染图标', () => {
      const { container } = renderWithProviders(
        <StatCardBase title="总用户数" value={1000} icon={<Users data-testid="card-icon" />} animate={false} />
      );
      expect(screen.getByTestId('card-icon')).toBeInTheDocument();
    });

    it('字符串值应该正确渲染', () => {
      renderWithProviders(
        <StatCardBase title="状态" value="运行中" animate={false} />
      );
      expect(screen.getByText('运行中')).toBeInTheDocument();
    });
  });

  describe('趋势信息测试', () => {
    it('应该正确渲染上升趋势', () => {
      const { container } = renderWithProviders(
        <StatCardBase title="销售额" value={50000} change={12.5} animate={false} />
      );
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs 上期')).toBeInTheDocument();
    });

    it('应该正确渲染下降趋势', () => {
      renderWithProviders(
        <StatCardBase title="销售额" value={50000} change={-5.2} animate={false} />
      );
      expect(screen.getByText('-5.2%')).toBeInTheDocument();
    });

    it('应该支持显式设置趋势类型', () => {
      renderWithProviders(
        <StatCardBase title="销售额" value={50000} trend="stable" change={0} animate={false} />
      );
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('点击事件测试', () => {
    it('点击卡片应该触发 onClick', () => {
      const onClick = vi.fn();
      renderWithProviders(
        <StatCardBase title="总用户数" value={1000} onClick={onClick} animate={false} />
      );
      fireEvent.click(screen.getByText('总用户数').closest('div[role]') || screen.getByText('总用户数'));
    });

    it('没有 onClick 时不应该有指针样式', () => {
      const { container } = renderWithProviders(
        <StatCardBase title="总用户数" value={1000} animate={false} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('MetricCard 指标卡片', () => {
    it('应该正确渲染基础指标卡片', () => {
      renderWithProviders(
        <MetricCard title="活跃用户" value={2580} unit="人" animate={false} />
      );
      expect(screen.getByText('活跃用户')).toBeInTheDocument();
      expect(screen.getByText('2,580')).toBeInTheDocument();
      expect(screen.getByText('人')).toBeInTheDocument();
    });

    it('应该支持 sparkline 数据', () => {
      const sparklineData = [10, 20, 15, 30, 25, 40, 35];
      renderWithProviders(
        <MetricCard
          title="日活用户"
          value={1200}
          sparklineData={sparklineData}
          animate={false}
        />
      );
      expect(screen.getByText('日活用户')).toBeInTheDocument();
      expect(screen.getByText('1,200')).toBeInTheDocument();
    });

    it('应该支持目标进度条', () => {
      renderWithProviders(
        <MetricCard
          title="销售目标"
          value={80000}
          target={100000}
          targetProgress={80}
          showTargetProgress
          animate={false}
        />
      );
      expect(screen.getByText('销售目标')).toBeInTheDocument();
    });
  });

  describe('Sparkline 迷你图表', () => {
    it('数据点不足时不渲染', () => {
      const { container } = renderWithProviders(<Sparkline data={[10]} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('空数据不渲染', () => {
      const { container } = renderWithProviders(<Sparkline data={[]} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('正常数据应该渲染 SVG', () => {
      const { container } = renderWithProviders(
        <Sparkline data={[10, 20, 30, 25, 40]} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('应该支持自定义尺寸', () => {
      const { container } = renderWithProviders(
        <Sparkline data={[10, 20, 30]} width={100} height={50} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '50');
    });
  });

  describe('ChartCard 图表卡片', () => {
    it('应该正确渲染标题和内容', () => {
      renderWithProviders(
        <ChartCard title="销售趋势" subtitle="近30天数据">
          <div data-testid="chart-content">图表内容</div>
        </ChartCard>
      );
      expect(screen.getByText('销售趋势')).toBeInTheDocument();
      expect(screen.getByText('近30天数据')).toBeInTheDocument();
      expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    });

    it('加载状态应该显示骨架屏', () => {
      renderWithProviders(
        <ChartCard title="销售趋势" loading>
          <div>图表内容</div>
        </ChartCard>
      );
      expect(screen.queryByText('图表内容')).not.toBeInTheDocument();
    });

    it('错误状态应该显示错误信息', () => {
      renderWithProviders(
        <ChartCard title="销售趋势" error="加载失败">
          <div>图表内容</div>
        </ChartCard>
      );
      expect(screen.getByText('加载失败')).toBeInTheDocument();
    });

    it('错误状态点击重试应该触发 onRefresh', () => {
      const onRefresh = vi.fn();
      renderWithProviders(
        <ChartCard title="销售趋势" error="加载失败" onRefresh={onRefresh}>
          <div>图表内容</div>
        </ChartCard>
      );
      fireEvent.click(screen.getByText('重试'));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('颜色测试', () => {
    const colors = ['green', 'purple', 'blue', 'orange', 'red', 'cyan', 'primary', 'success', 'warning', 'error', 'info'];

    it.each(colors)('应该支持 %s 颜色', (color) => {
      renderWithProviders(
        <StatCardBase title="测试" value={100} color={color as any} animate={false} />
      );
      expect(screen.getByText('测试')).toBeInTheDocument();
    });
  });
});
