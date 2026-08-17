import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  FileText as FileTextIcon,
  Clock as ClockIcon,
  Users as UsersIcon,
  BarChart3 as AnalyticsIcon,
  Download,
  FileBarChart,
} from 'lucide-react';
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { reportApi } from '@/api/report';
import type { ReportData } from '@/api/report';
import { reportSchema } from '@/schemas/report';
import { designTokens } from '@/theme/tokens';
import { REPORT_PATHS } from '@/modules/report/config';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const reportApiAdapter: CrudApiAdapter<ReportData> = {
  list: async (params) => {
    const response = await reportApi.listReports();
    if (!response.success) {
      throw new Error(response.message || i18n.t('pages.report_list_page.k0'));
    }
    let items = Array.isArray(response.data) ? response.data : [];

    if (params?.report_type && params.report_type !== 'all') {
      items = items.filter((r) => r.config.report_type === params.report_type);
    }
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter((r) => r.config.title?.toLowerCase().includes(q));
    }

    const total = items.length;
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return { data: paged, total };
  },
  create: async () => {
    throw new Error(i18n.t('pages.report_list_page.k1'));
  },
  update: async () => {
    throw new Error(i18n.t('pages.report_list_page.k2'));
  },
  delete: async (id) => {
    const response = await reportApi.deleteReport(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('pages.report_list_page.k3'));
    }
  },
};

const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const exportMutation = useMutation({
    mutationFn: async (report: ReportData) => {
      const response = await reportApi.exportReport(report.id, { format: 'excel' });
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('pages.report_list_page.k4'));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REPORT.REPORTS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: i18n.t('pages.report_list_page.k5'),
        message: i18n.t('pages.report_list_page.k6'),
      });
    },
    onError: (error: unknown) => {
      apiLogger.error(i18n.t('pages.report_list_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('pages.report_list_page.k7'),
        message: i18n.t('pages.report_list_page.k8'),
      });
    },
  });

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: i18n.t('pages.report_list_page.k9'),
        onClick: (row) => {
          const id = String(row.id);
          if (id) {
            navigate(`${REPORT_PATHS.viewer}/${id}`);
          }
        },
      },
      {
        key: 'export',
        label: i18n.t('pages.report_list_page.k10'),
        icon: <Download size={16} />,
        onClick: (row) => {
          exportMutation.mutate(row as unknown as ReportData);
        },
      },
    ],
    [exportMutation, navigate]
  );

  const headerContent = React.useCallback((rows: ReportData[]) => {
    const today = rows.filter((r) => {
      const date = new Date(r.created_at);
      const todayDate = new Date();
      return date.toDateString() === todayDate.toDateString();
    }).length;

    const stats = [
      {
        label: i18n.t('pages.report_list_page.k11'),
        value: rows.length,
        icon: FileTextIcon,
        color: 'primary',
      },
      {
        label: i18n.t('pages.report_list_page.k12'),
        value: today,
        icon: AnalyticsIcon,
        color: 'success',
      },
      { label: i18n.t('pages.report_list_page.k13'), value: 0, icon: ClockIcon, color: 'warning' },
      { label: i18n.t('pages.report_list_page.k14'), value: 0, icon: UsersIcon, color: 'info' },
    ];

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <Typography
                      color='text.secondary'
                      variant='body2'
                    >
                      {card.label}
                    </Typography>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 'bold' }}
                    >
                      {card.value}
                    </Typography>
                  </div>
                  <Icon
                    color={card.color as React.CSSProperties['color']}
                    size={32}
                  />
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  }, []);

  return (
    <PageContainer
      title={i18n.t('pages.report_list_page.k15')}
      subtitle={i18n.t('pages.report_list_page.k16')}
      headerProps={{
        pageIcon: <FileBarChart style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={reportSchema}
        apiAdapter={reportApiAdapter}
        customRowActions={customRowActions}
        headerContent={
          headerContent as unknown as (
            rows: Record<string, unknown>[],
            total: number
          ) => React.ReactNode
        }
        breadcrumbs={[
          { label: i18n.t('pages.report_list_page.k18'), href: '/dashboard' },
          { label: i18n.t('pages.report_list_page.k17') },
        ]}
      />
    </PageContainer>
  );
};

export default ReportListPage;
