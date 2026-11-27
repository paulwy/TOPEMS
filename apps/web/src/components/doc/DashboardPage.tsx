import React, { useMemo } from 'react';
import styles from './DashboardPage.module.css';
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
import i18n from '@/i18n';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { docApi } from '@/api/doc';
import type { DocDashboardStats } from '@/api/doc';
import { LazyChart } from '@/components/charts';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTheme } from '@mui/material';

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
  if (hour < 12) return i18n.t('pages.dashboard_page.k3');
  if (hour < 18) return i18n.t('pages.dashboard_page.k4');
  return i18n.t('pages.dashboard_page.k5');
};

const DocumentDashboardPage: React.FC = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const { data: statsData, isPending: loading } = useQuery<DocDashboardStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.DOC_DASHBOARD_BASE,
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
        title: i18n.t('doc.documents.stat_files'),
        value: statsData.total_documents.toLocaleString(),
        icon: iconMap.FileText,
        color: 'primary',
      },
      {
        id: 'published-documents',
        title: i18n.t('doc.status.published'),
        value: statsData.published_documents.toLocaleString(),
        icon: iconMap.FolderOpen,
        color: 'success',
      },
      {
        id: 'draft-documents',
        title: i18n.t('doc.status.draft'),
        value: statsData.draft_documents.toLocaleString(),
        icon: iconMap.Clock,
        color: 'info',
      },
      {
        id: 'archived-documents',
        title: i18n.t('doc.status.archived'),
        value: statsData.archived_documents.toLocaleString(),
        icon: iconMap.Star,
        color: 'warning',
      },
      {
        id: 'total-folders',
        title: i18n.t('doc.documents.stat_folders'),
        value: statsData.total_folders.toLocaleString(),
        icon: iconMap.HardDrive,
        color: 'secondary',
      },
      {
        id: 'templates',
        title: i18n.t('doc.menu.template'),
        value: statsData.total_templates.toLocaleString(),
        icon: iconMap.FileSpreadsheet,
        color: 'error',
      },
    ];
  }, [statsData]);

  const charts: ChartCard[] = useMemo(() => {
    if (!statsData) return [];
    const pieData = [
      { name: i18n.t('pages.dashboard_page.k9'), value: statsData.published_documents },
      { name: i18n.t('pages.dashboard_page.k10'), value: statsData.draft_documents },
      { name: i18n.t('pages.dashboard_page.k11'), value: statsData.archived_documents },
    ];
    const lineData = [
      { name: i18n.t('pages.dashboard_page.k12'), value: statsData.total_documents },
      { name: i18n.t('pages.dashboard_page.k13'), value: statsData.total_templates },
      { name: i18n.t('pages.dashboard_page.k14'), value: statsData.total_folders },
      { name: i18n.t('pages.dashboard_page.k15'), value: statsData.this_month_created },
      { name: i18n.t('pages.dashboard_page.k16'), value: statsData.this_month_updated },
    ];
    return [
      {
        id: 'document-type-distribution',
        title: i18n.t('pages.dashboard_page.k17'),
        chart: (
          <LazyChart
            type='pie'
            data={pieData}
          />
        ),
        height: 300,
      },
      {
        id: 'upload-trend',
        title: i18n.t('pages.dashboard_page.k18'),
        chart: (
          <LazyChart
            type='line'
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
      label: i18n.t('pages.dashboard_page.k19'),
      icon: <Upload size={18} />,
      onClick: () => {
        addNotification({
          title: i18n.t('pages.dashboard_page.k20'),
          message: i18n.t('pages.dashboard_page.k21'),
          type: 'info',
        });
      },
    },
    {
      id: 'new-folder',
      label: i18n.t('pages.dashboard_page.k22'),
      icon: <FolderPlus size={18} />,
      onClick: () => {
        addNotification({
          title: i18n.t('pages.dashboard_page.k23'),
          message: i18n.t('pages.dashboard_page.k24'),
          type: 'info',
        });
      },
    },
    {
      id: 'document-template',
      label: i18n.t('pages.dashboard_page.k25'),
      icon: <FileType size={18} />,
      onClick: () => {
        addNotification({
          title: i18n.t('pages.dashboard_page.k26'),
          message: i18n.t('pages.dashboard_page.k27'),
          type: 'info',
        });
      },
    },
    {
      id: 'recycle-bin',
      label: i18n.t('pages.dashboard_page.k28'),
      icon: <Trash2 size={18} />,
      onClick: () => {
        addNotification({
          title: i18n.t('pages.dashboard_page.k29'),
          message: i18n.t('pages.dashboard_page.k30'),
          type: 'info',
        });
      },
    },
  ];

  return (
    <PageContainer
      title={i18n.t('pages.dashboard_page.k31')}
      subtitle={`${getGreeting()}，${i18n.t('pages.dashboard_page.k6')}`}
      headerProps={{
        pageIcon: <FileText className={styles.il1} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.cyan.main} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        autoTitle={false}
        subtitle=''
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle={i18n.t('pages.dashboard_page.k32')}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('pages.dashboard_page.k33')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DocumentDashboardPage;
