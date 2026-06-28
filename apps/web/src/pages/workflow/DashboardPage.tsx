import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  Timer,
  TrendingDown,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import PieChartComponent from '../../components/charts/PieChart';
import BarChartComponent from '../../components/charts/BarChart';
import { PageContainer } from '@/components/common';
import { ModuleStatsCard } from '@/components/dashboard';
import { Box, Typography } from '@mui/material';

const iconMap: Record<string, React.ReactNode> = {
  CheckCircle: <CheckCircle size={24} />,
  Clock: <Clock size={24} />,
  AlertCircle: <AlertCircle size={24} />,
  FileText: <FileText size={24} />,
  Timer: <Timer size={24} />,
  TrendingDown: <TrendingDown size={24} />,
  UserCheck: <UserCheck size={24} />,
  BarChart3: <BarChart3 size={24} />,
};

const pieData = [
  { name: '请假申请', value: 35 },
  { name: '采购审批', value: 25 },
  { name: '出差申请', value: 20 },
  { name: '其他', value: 20 },
];

const barData = [
  { name: '1月', value: 80 },
  { name: '2月', value: 120 },
  { name: '3月', value: 95 },
  { name: '4月', value: 150 },
  { name: '5月', value: 130 },
  { name: '6月', value: 180 },
];

const bottleneckProcesses = [
  { name: '采购合同审批', overdueCount: 5, avgDays: 7.2, status: 'critical' },
  { name: '出差申请审批', overdueCount: 3, avgDays: 4.5, status: 'warning' },
  { name: '请假审批', overdueCount: 1, avgDays: 2.1, status: 'normal' },
  { name: '报销审批', overdueCount: 2, avgDays: 3.8, status: 'warning' },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = [
    {
      id: 'pending-approvals',
      title: '待我审批',
      value: '8',
      icon: iconMap.Clock,
      change: 3,
      changeLabel: 'vs 上周期',
      color: 'warning',
    },
    {
      id: 'submitted-applications',
      title: '已提交申请',
      value: '24',
      icon: iconMap.FileText,
      change: 5,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'completed-processes',
      title: '已完成流程',
      value: '156',
      icon: iconMap.CheckCircle,
      change: 12,
      changeLabel: 'vs 上周期',
      color: 'success',
    },
    {
      id: 'timeout-warning',
      title: '超时预警',
      value: '2',
      icon: iconMap.AlertCircle,
      change: -1,
      changeLabel: 'vs 上周期',
      color: 'error',
    },
    {
      id: 'avg-completion-time',
      title: '平均完成时间',
      value: '2.4天',
      icon: iconMap.Timer,
      change: -0.3,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'bottleneck-processes',
      title: '瓶颈流程',
      value: '3',
      icon: iconMap.TrendingDown,
      change: 1,
      changeLabel: '需关注',
      color: 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'process-type-distribution',
      title: '流程类型分布',
      chart: <PieChartComponent data={pieData} />,
      height: 300,
    },
    {
      id: 'monthly-process-trend',
      title: '月度流程数量趋势',
      chart: (
        <BarChartComponent
          data={barData}
          xKey='name'
          yKey='value'
        />
      ),
      height: 300,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: 'approval-1',
      title: '请假申请 - 张三',
      description: '10分钟前',
      onClick: () => navigate('/flow/approvals'),
    },
    {
      id: 'approval-2',
      title: '采购审批 - 办公室',
      description: '30分钟前',
      onClick: () => navigate('/flow/approvals'),
    },
    {
      id: 'approval-3',
      title: '出差申请 - 李四',
      description: '1小时前',
      onClick: () => navigate('/flow/approvals'),
    },
    {
      id: 'approval-4',
      title: '加班申请 - 王五',
      description: '2小时前',
      onClick: () => navigate('/flow/approvals'),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'start-process',
      label: '发起流程',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/flow/designer'),
    },
    {
      id: 'my-applications',
      label: '我的申请',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/flow/instances'),
    },
    {
      id: 'pending-approval',
      label: '待我审批',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/flow/approvals'),
    },
    {
      id: 'process-statistics',
      label: '流程统计',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/flow/statistics'),
    },
  ];

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      {/* 工作流模块概览统计 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, sm: 2, md: 4 }, gap: 3, mb: 3 }}>
        <ModuleStatsCard
          title='工作流总数'
          total={12}
          active={10}
          icon={BarChart3 as any}
          iconBgColor='#e0f2fe'
          iconColor='#0284c7'
        />
        <ModuleStatsCard
          title='审批节点'
          total={48}
          active={42}
          icon={UserCheck as any}
          iconBgColor='#dcfce7'
          iconColor='#16a34a'
        />
        <ModuleStatsCard
          title='运行中实例'
          total={35}
          active={28}
          icon={Clock as any}
          iconBgColor='#fef9c3'
          iconColor='#ca8a04'
        />
        <ModuleStatsCard
          title='超时流程'
          total={5}
          active={3}
          icon={AlertCircle as any}
          iconBgColor='#fee2e2'
          iconColor='#dc2626'
        />
      </Box>

      {/* 瓶颈流程提示 */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2, color: 'grey.800' }}
        >
          <TrendingDown
            size={20}
            style={{ verticalAlign: 'middle', marginRight: 8, color: '#ca8a04' }}
          />
          瓶颈流程监控
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, sm: 2, md: 4 }, gap: 2 }}>
          {bottleneckProcesses.map((process) => (
            <Box
              key={process.name}
              onClick={() => navigate('/flow/statistics')}
              sx={{
                bgcolor: process.status === 'critical' ? '#fef2f2' : process.status === 'warning' ? '#fffbeb' : '#f0fdf4',
                border: 1,
                borderColor: process.status === 'critical' ? '#fecaca' : process.status === 'warning' ? '#fde68a' : '#bbf7d0',
                borderRadius: 2,
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 2, transform: 'translateY(-1px)' },
              }}
            >
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {process.name}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.600' }}
                >
                  超时 {process.overdueCount} 件
                </Typography>
                <Typography
                  variant='caption'
                  sx={{
                    color: process.status === 'critical' ? '#dc2626' : process.status === 'warning' ? '#ca8a04' : '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  平均 {process.avgDays} 天
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <DashboardTemplate
        title='工作流程'
        subtitle={`${getGreeting()}，流程审批与进度追踪`}
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='待我审批'
        quickActions={quickActions}
        quickActionsTitle='快速操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
