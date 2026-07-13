/**
 * 流程统计分析页面
 *
 * @module pages/workflow
 * @path /workflow/statistics
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Timer,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  FileText,
  Zap,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Box, Typography, Chip, Stack, Menu, MenuItem, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { PageContainer } from '@/components/common';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type RecentItem,
} from '@/components/templates';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import { useNotificationStore } from '../../store';
import { handleApiError, getErrorMessage } from '@/utils/errors';
import { designTokens } from '@/theme/tokens';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';

const ct = designTokens.colors;

type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'quarter', label: '本季度' },
  { value: 'year', label: '本年' },
];

const generateTrendData = (range: TimeRange) => {
  const counts: Record<TimeRange, number> = {
    today: 24,
    week: 7,
    month: 30,
    quarter: 12,
    year: 12,
  };
  const labels: Record<TimeRange, (i: number) => string> = {
    today: (i) => `${i}:00`,
    week: (i) => ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i] || '',
    month: (i) => `${i + 1}日`,
    quarter: (i) => `第${i + 1}周`,
    year: (i) => `${i + 1}月`,
  };
  const count = counts[range];
  return Array.from({ length: count }, (_, i) => ({
    name: labels[range](i),
    发起数: Math.floor(Math.random() * 50) + 20,
    完成数: Math.floor(Math.random() * 40) + 15,
  }));
};

const distributionData = [
  { name: '采购审批', value: 35 },
  { name: '请假申请', value: 25 },
  { name: '费用报销', value: 20 },
  { name: '合同审批', value: 12 },
  { name: '用章申请', value: 8 },
];

const efficiencyData = [
  { name: '采购审批', 平均耗时: 48 },
  { name: '请假申请', 平均耗时: 12 },
  { name: '费用报销', 平均耗时: 36 },
  { name: '合同审批', 平均耗时: 72 },
  { name: '用章申请', 平均耗时: 24 },
];

const bottleneckData = [
  { name: '发起申请', 平均停留: 0.5 },
  { name: '部门经理审批', 平均停留: 2.5 },
  { name: '财务审核', 平均停留: 4.0 },
  { name: '总经理审批', 平均停留: 6.0 },
  { name: '归档', 平均停留: 1.0 },
];

const topWorkflows = [
  { id: '1', name: '请假申请', count: 128, avgTime: '12小时', passRate: '95%' },
  { id: '2', name: '费用报销', count: 96, avgTime: '36小时', passRate: '88%' },
  { id: '3', name: '采购审批', count: 85, avgTime: '48小时', passRate: '82%' },
  { id: '4', name: '用章申请', count: 64, avgTime: '24小时', passRate: '92%' },
  { id: '5', name: '合同审批', count: 52, avgTime: '72小时', passRate: '78%' },
  { id: '6', name: '出差申请', count: 45, avgTime: '18小时', passRate: '90%' },
  { id: '7', name: '入职审批', count: 38, avgTime: '60小时', passRate: '96%' },
  { id: '8', name: '离职审批', count: 32, avgTime: '48小时', passRate: '94%' },
  { id: '9', name: '调岗申请', count: 28, avgTime: '54小时', passRate: '85%' },
  { id: '10', name: '转正申请', count: 25, avgTime: '36小时', passRate: '91%' },
];

export const WorkflowStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleTimeRangeClose = () => {
    setAnchorEl(null);
  };

  const handleTimeRangeSelect = (range: TimeRange) => {
    setTimeRange(range);
    handleTimeRangeClose();
    handleRefresh();
  };

  const currentTimeRangeLabel =
    timeRangeOptions.find((o) => o.value === timeRange)?.label || '本月';

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addNotification({
        message: '统计数据已刷新',
        type: 'success',
        duration: 3000,
      });
    }, 500);
  }, [addNotification]);

  const trendData = useMemo(() => generateTrendData(timeRange), [timeRange]);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total',
        title: '总发起数',
        value: '1,256',
        icon: <FileText size={20} />,
        change: 12,
        changeLabel: '环比增长',
        color: 'primary',
        trend: [20, 25, 22, 30, 28, 35, 32],
      },
      {
        id: 'completed',
        title: '已完成数',
        value: '1,089',
        icon: <CheckCircle size={20} />,
        change: 8,
        changeLabel: '环比增长',
        color: 'success',
        trend: [18, 22, 20, 26, 24, 30, 28],
      },
      {
        id: 'in-progress',
        title: '进行中',
        value: '167',
        icon: <Clock size={20} />,
        change: -3,
        changeLabel: '环比变化',
        color: 'warning',
        trend: [25, 22, 24, 20, 22, 18, 20],
      },
      {
        id: 'avg-duration',
        title: '平均时长',
        value: '32.5',
        unit: '小时',
        icon: <Timer size={20} />,
        change: -5.2,
        changeLabel: '环比变化',
        color: 'info',
        trend: [40, 38, 36, 35, 34, 33, 32],
      },
      {
        id: 'pass-rate',
        title: '通过率',
        value: '86.7',
        unit: '%',
        icon: <ThumbsUp size={20} />,
        change: 2.3,
        changeLabel: '环比提升',
        color: 'success',
        progress: 86.7,
        progressLabel: '通过率',
      },
      {
        id: 'reject-rate',
        title: '驳回率',
        value: '13.3',
        unit: '%',
        icon: <ThumbsDown size={20} />,
        change: -1.8,
        changeLabel: '环比下降',
        color: 'error',
        progress: 13.3,
        progressLabel: '驳回率',
      },
    ],
    []
  );

  const BottleneckChart = useMemo(
    () => (
      <ResponsiveContainer
        width='100%'
        height={280}
      >
        <BarChart
          data={bottleneckData}
          layout='vertical'
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis
            type='number'
            unit='h'
          />
          <YAxis
            dataKey='name'
            type='category'
            width={100}
          />
          <Tooltip
            formatter={(value) => [`${value} 小时`, '平均停留时间'] as [string, string]}
            contentStyle={{
              borderRadius: 8,
              padding: 12,
            }}
          />
          <Bar
            dataKey='平均停留'
            radius={[0, 4, 4, 0]}
          >
            {bottleneckData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  index === bottleneckData.length - 1
                    ? 'error.main'
                    : index === bottleneckData.length - 2
                      ? 'warning.main'
                      : 'primary.main'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ),
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'trend',
        title: '流程趋势图',
        subtitle: '近30天流程发起与完成趋势',
        chart: (
          <LineChartComponent
            data={trendData}
            xKey='name'
            yKeys={[
              { key: '发起数', name: '发起数', color: 'primary.main' },
              { key: '完成数', name: '完成数', color: 'success.main' },
            ]}
            height={280}
          />
        ),
        height: 360,
        type: 'line',
        onRefresh: handleRefresh,
      },
      {
        id: 'distribution',
        title: '流程分布图',
        subtitle: '按流程类型分布占比',
        chart: <PieChartComponent data={distributionData} />,
        height: 360,
        type: 'pie',
        onRefresh: handleRefresh,
      },
      {
        id: 'efficiency',
        title: '效率分析图',
        subtitle: '各流程类型平均耗时（小时）',
        chart: (
          <ResponsiveContainer
            width='100%'
            height={280}
          >
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis unit='h' />
              <Tooltip
                formatter={(value) => [`${value} 小时`, '平均耗时'] as [string, string]}
                contentStyle={{
                  borderRadius: 8,
                  padding: 12,
                }}
              />
              <Bar
                dataKey='平均耗时'
                fill='secondary.main'
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ),
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
      {
        id: 'bottleneck',
        title: '节点瓶颈分析',
        subtitle: '各节点平均停留时间（小时）',
        chart: BottleneckChart,
        height: 360,
        type: 'bar',
        onRefresh: handleRefresh,
      },
    ],
    [trendData, BottleneckChart, handleRefresh]
  );

  const topItems: RecentItem[] = useMemo(
    () =>
      topWorkflows.map((item, index) => ({
        id: item.id,
        title: item.name,
        description: `发起 ${item.count} 次 · 平均耗时 ${item.avgTime}`,
        icon: <Zap size={18} />,
        status: index < 3 ? 'success' : index < 6 ? 'info' : 'default',
        tags: [
          { label: `#${index + 1}`, color: index < 3 ? 'warning.main' : undefined },
          { label: `通过率 ${item.passRate}` },
        ],
        onClick: () => navigate(WORKFLOW_PATHS.definitions),
      })),
    [navigate]
  );

  const headerContent = (
    <Stack
      direction='row'
      spacing={1}
      sx={{ alignItems: 'center' }}
    >
      <Button
        size='small'
        variant='outlined'
        startIcon={<Calendar size={16} />}
        onClick={handleTimeRangeClick}
        sx={{ textTransform: 'none' }}
      >
        {currentTimeRangeLabel}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleTimeRangeClose}
      >
        {timeRangeOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={timeRange === option.value}
            onClick={() => handleTimeRangeSelect(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );

  return (
    <PageContainer
      title='流程统计分析'
      subtitle='全方位流程数据洞察与效率分析'
      headerProps={{
        pageIcon: <BarChart3 size={20} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
        backButton: {
          href: WORKFLOW_PATHS.dashboard,
          visible: true,
        },
        children: headerContent,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={loading}
        stats={stats}
        charts={charts}
        recentItems={topItems}
        recentTitle='Top 10 高频流程'
        onRefresh={handleRefresh}
        layout={{
          statsBreakpoints: { xs: 12, sm: 6, md: 4, lg: 4, xl: 4 },
        }}
      />
    </PageContainer>
  );
};

export default WorkflowStatisticsPage;
