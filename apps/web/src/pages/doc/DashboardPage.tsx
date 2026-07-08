import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  FolderOpen,
  Clock,
  Star,
  HardDrive,
  FileSpreadsheet,
  Upload,
  FolderPlus,
  FileType,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import PieChartComponent from '../../components/charts/PieChart';
import LineChartComponent from '../../components/charts/LineChart';
import { useAppStore } from '../../store';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FolderOpen: <FolderOpen size={24} />,
  Clock: <Clock size={24} />,
  Star: <Star size={24} />,
  HardDrive: <HardDrive size={24} />,
  FileSpreadsheet: <FileSpreadsheet size={24} />,
};

const pieData = [
  { name: 'PDF', value: 35 },
  { name: 'Word', value: 28 },
  { name: 'Excel', value: 18 },
  { name: 'PPT', value: 12 },
  { name: '图片', value: 7 },
];

const lineData = [
  { name: '周一', uploads: 12 },
  { name: '周二', uploads: 19 },
  { name: '周三', uploads: 15 },
  { name: '周四', uploads: 22 },
  { name: '周五', uploads: 28 },
  { name: '周六', uploads: 8 },
  { name: '周日', uploads: 5 },
];

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DocumentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = [
    {
      id: 'my-documents',
      title: '我的文档',
      value: '256',
      icon: iconMap.FileText,
      change: 12,
      changeLabel: 'vs 上周',
      color: 'primary',
    },
    {
      id: 'shared-documents',
      title: '共享文档',
      value: '89',
      icon: iconMap.FolderOpen,
      change: 5,
      changeLabel: 'vs 上周',
      color: 'success',
    },
    {
      id: 'recent-access',
      title: '最近访问',
      value: '34',
      icon: iconMap.Clock,
      change: 8,
      changeLabel: 'vs 上周',
      color: 'info',
    },
    {
      id: 'favorites',
      title: '收藏夹',
      value: '42',
      icon: iconMap.Star,
      change: 3,
      changeLabel: 'vs 上周',
      color: 'warning',
    },
    {
      id: 'storage',
      title: '存储空间',
      value: '2.4',
      unit: 'GB',
      icon: iconMap.HardDrive,
      change: -2,
      changeLabel: 'vs 上周',
      color: 'secondary',
      progress: 48,
      progressLabel: '已用 48%',
    },
    {
      id: 'templates',
      title: '文档模板',
      value: '15',
      icon: iconMap.FileSpreadsheet,
      change: 2,
      changeLabel: 'vs 上周',
      color: 'error',
    },
  ];

  const charts: ChartCard[] = [
    {
      id: 'document-type-distribution',
      title: '文档类型分布',
      chart: <PieChartComponent data={pieData} />,
      height: 300,
    },
    {
      id: 'upload-trend',
      title: '上传趋势（近7天）',
      chart: (
        <LineChartComponent
          data={lineData}
          xKey='name'
          yKey='uploads'
          height={260}
        />
      ),
      height: 300,
    },
  ];

  const recentItems: RecentItem[] = [
    {
      id: 'doc-1',
      title: '2024年度工作总结报告.pdf',
      description: 'PDF · 工作文档 · 10分钟前',
      status: 'success',
    },
    {
      id: 'doc-2',
      title: '产品需求规格说明书.docx',
      description: 'Word · 项目文档 · 30分钟前',
      status: 'success',
    },
    {
      id: 'doc-3',
      title: '财务报表-第四季度.xlsx',
      description: 'Excel · 财务文档 · 1小时前',
      status: 'default',
    },
    {
      id: 'doc-4',
      title: '项目进度汇报.pptx',
      description: 'PPT · 项目文档 · 2小时前',
      status: 'info',
    },
    {
      id: 'doc-5',
      title: '产品架构设计图.png',
      description: '图片 · 技术文档 · 3小时前',
      status: 'success',
    },
    {
      id: 'doc-6',
      title: '员工手册.pdf',
      description: 'PDF · 规章制度 · 昨天',
      status: 'default',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'upload-document',
      label: '上传文档',
      icon: <Upload size={18} />,
      onClick: () => {
        addNotification({
          title: '提示',
          message: '上传文档功能开发中',
          type: 'info',
        });
      },
    },
    {
      id: 'new-folder',
      label: '新建文件夹',
      icon: <FolderPlus size={18} />,
      onClick: () => {
        addNotification({
          title: '提示',
          message: '新建文件夹功能开发中',
          type: 'info',
        });
      },
    },
    {
      id: 'document-template',
      label: '文档模板',
      icon: <FileType size={18} />,
      onClick: () => {
        addNotification({
          title: '提示',
          message: '文档模板功能开发中',
          type: 'info',
        });
      },
    },
    {
      id: 'recycle-bin',
      label: '回收站',
      icon: <Trash2 size={18} />,
      onClick: () => {
        addNotification({
          title: '提示',
          message: '回收站功能开发中',
          type: 'info',
        });
      },
    },
  ];

  return (
    <PageContainer
      title='仪表盘'
      subtitle={`${getGreeting()}，文档管理中心`}
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.cyan.main} 100%)`,
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
        recentTitle='最近文档'
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DocumentDashboardPage;
