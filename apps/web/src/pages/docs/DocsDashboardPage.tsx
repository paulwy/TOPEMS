import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Clock, Star, ArrowRight } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import { PageContainer } from '@/components/common';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import PieChartComponent from '../../components/charts/PieChart';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FolderOpen: <FolderOpen size={24} />,
  Clock: <Clock size={24} />,
  Star: <Star size={24} />,
};

const pieData = [
  { name: 'PDF', value: 35 },
  { name: 'Word', value: 25 },
  { name: 'Markdown', value: 20 },
  { name: 'Excel', value: 15 },
  { name: '其他', value: 5 },
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
      id: 'my-documents',
      title: '我的文档',
      value: '128',
      icon: iconMap.FileText,
      change: 12,
      changeLabel: 'vs 上周期',
      color: 'primary',
    },
    {
      id: 'shared-documents',
      title: '共享文档',
      value: '456',
      icon: iconMap.FolderOpen,
      change: 25,
      changeLabel: 'vs 上周期',
      color: 'info',
    },
    {
      id: 'recent-access',
      title: '最近访问',
      value: '32',
      icon: iconMap.Clock,
      change: 8,
      changeLabel: 'vs 上周期',
      color: 'success',
    },
    {
      id: 'favorites',
      title: '收藏夹',
      value: '15',
      icon: iconMap.Star,
      change: 3,
      changeLabel: 'vs 上周期',
      color: 'warning',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'document-type-distribution',
      title: '文档类型分布',
      chart: <PieChartComponent data={pieData} />,
      height: 300,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: 'doc-1',
      title: '2024年度财务报告',
      description: 'PDF · 10分钟前',
      onClick: () => navigate('/documents'),
    },
    {
      id: 'doc-2',
      title: '产品需求文档 v2.0',
      description: 'Word · 30分钟前',
      onClick: () => navigate('/documents'),
    },
    {
      id: 'doc-3',
      title: '会议纪要 - 项目启动会',
      description: 'Markdown · 1小时前',
      onClick: () => navigate('/documents'),
    },
    {
      id: 'doc-4',
      title: '技术架构设计',
      description: 'PDF · 2小时前',
      onClick: () => navigate('/documents'),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'upload-document',
      label: '上传文档',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/documents/upload'),
    },
    {
      id: 'document-center',
      label: '文档中心',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/document-center'),
    },
    {
      id: 'knowledge-base',
      label: '知识库',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/knowledge-base'),
    },
    {
      id: 'template-management',
      label: '模板管理',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate('/templates'),
    },
  ];

  return (
    <PageContainer
      title='文档中心'
      subtitle={`${getGreeting()}，文档管理与协作`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='最近访问'
        quickActions={quickActions}
        quickActionsTitle='快速操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
