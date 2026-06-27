import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import PieChartComponent from '../../components/charts/PieChart';

const iconMap: Record<string, React.ReactNode> = {
  Users: <Users size={24} />,
  Shield: <Shield size={24} />,
  Activity: <Activity size={24} />,
  AlertTriangle: <AlertTriangle size={24} />,
};

const pieData = [
  { name: '管理员', value: 5 },
  { name: '审计员', value: 10 },
  { name: '普通用户', value: 75 },
  { name: '访客', value: 10 },
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
      id: 'total-users',
      title: '用户总数',
      value: '1,280',
      icon: iconMap.Users,
      change: 45,
      changeLabel: 'vs 上周期',
      color: 'primary',
    },
    {
      id: 'online-users',
      title: '在线用户',
      value: '128',
      icon: iconMap.Activity,
      change: 12,
      changeLabel: 'vs 上周期',
      color: 'success',
    },
    {
      id: 'role-count',
      title: '角色数量',
      value: '15',
      icon: iconMap.Shield,
      change: 2,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'system-alerts',
      title: '系统告警',
      value: '3',
      icon: iconMap.AlertTriangle,
      change: -5,
      changeLabel: 'vs 上周期',
      color: 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'user-role-distribution',
      title: '用户角色分布',
      chart: <PieChartComponent data={pieData} />,
      height: 300,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: 'user-1',
      title: '张三',
      description: '管理员 · 10分钟前',
      status: 'success',
    },
    {
      id: 'user-2',
      title: '李四',
      description: '普通用户 · 30分钟前',
      status: 'success',
    },
    {
      id: 'user-3',
      title: '王五',
      description: '审计员 · 1小时前',
      status: 'default',
    },
    {
      id: 'user-4',
      title: '赵六',
      description: '普通用户 · 2小时前',
      status: 'success',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'user-management',
      label: '用户管理',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/iam/users'),
    },
    {
      id: 'role-management',
      label: '角色管理',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/iam/roles'),
    },
    {
      id: 'permission-management',
      label: '权限管理',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/iam/permissions'),
    },
    {
      id: 'audit-log',
      label: '审计日志',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/iam/audit'),
    },
  ];

  return (
    <PageContainer
      title='系统管理'
      subtitle={`${getGreeting()}，身份认证与访问控制`}
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='最近活跃用户'
        quickActions={quickActions}
        quickActionsTitle='快速操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
