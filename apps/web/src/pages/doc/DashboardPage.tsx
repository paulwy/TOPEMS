import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import PieChartComponent from '../../components/charts/PieChart';
import LineChartComponent from '../../components/charts/LineChart';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { docApi } from '@/api/doc';
import type { DocDashboardStats } from '@/api/doc';

const ct = designTokens.colors;

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FolderOpen: <FolderOpen size={24} />,
  Clock: <Clock size={24} />,
  Star: <Star size={24} />,
  HardDrive: <HardDrive size={24} />,
  FileSpreadsheet: <FileSpreadsheet size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DocumentDashboardPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: statsData, isLoading: loading } = useQuery<DocDashboardStats | null>({
    queryKey: ['doc-dashboard'],
    queryFn: async () => {
      const response = await docApi.getDashboard();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats: StatCard[] = useMemo(() => {
    if (!statsData) return [];
    return [
      {
        id: 'total-documents',
        title: '文档总数',
        value: statsData.total_documents.toLocaleString(),
        icon: iconMap.FileText,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'primary',
      },
      {
        id: 'published-documents',
        title: '已发布',
        value: statsData.published_documents.toLocaleString(),
        icon: iconMap.FolderOpen,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'success',
      },
      {
        id: 'draft-documents',
        title: '草稿',
        value: statsData.draft_documents.toLocaleString(),
        icon: iconMap.Clock,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'info',
      },
      {
        id: 'archived-documents',
        title: '已归档',
        value: statsData.archived_documents.toLocaleString(),
        icon: iconMap.Star,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'warning',
      },
      {
        id: 'total-folders',
        title: '文件夹',
        value: statsData.total_folders.toLocaleString(),
        icon: iconMap.HardDrive,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'secondary',
      },
      {
        id: 'templates',
        title: '文档模板',
        value: statsData.total_templates.toLocaleString(),
        icon: iconMap.FileSpreadsheet,
        change: 0,
        changeLabel: 'vs 上周',
        color: 'error',
      },
    ];
  }, [statsData]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statsData) return [];
    const pieData = [
      { name: '已发布', value: statsData.published_documents },
      { name: '草稿', value: statsData.draft_documents },
      { name: '已归档', value: statsData.archived_documents },
    ];
    const lineData = [
      { name: '文档', value: statsData.total_documents },
      { name: '模板', value: statsData.total_templates },
      { name: '文件夹', value: statsData.total_folders },
      { name: '本月新增', value: statsData.this_month_created },
      { name: '本月更新', value: statsData.this_month_updated },
    ];
    return [
      {
        id: 'document-type-distribution',
        title: '文档状态分布',
        chart: <PieChartComponent data={pieData} />,
        height: 300,
      },
      {
        id: 'upload-trend',
        title: '文档统计',
        chart: (
          <LineChartComponent
            data={lineData}
            xKey='name'
            yKey='value'
            height={260}
          />
        ),
        height: 300,
      },
    ];
  }, [statsData]);

  const recentItems: RecentItem[] = [];

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
