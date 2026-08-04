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

const ct = designTokens.colors;

const reportApiAdapter: CrudApiAdapter<ReportData> = {
  list: async (params) => {
    const response = await reportApi.listReports();
    if (!response.success) {
      throw new Error(response.message || '加载报表数据失败');
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
    throw new Error('暂不支持通过表单创建报表');
  },
  update: async () => {
    throw new Error('暂不支持通过表单编辑报表');
  },
  delete: async (id) => {
    const response = await reportApi.deleteReport(id);
    if (!response.success) {
      throw new Error(response.message || '删除报表失败');
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
        throw new Error(response.message || '导出报表失败');
      }
      return response.data;
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '导出成功',
        message: '导出报表成功',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('导出报表失败:', error);
      addNotification({
        type: 'error',
        title: '导出失败',
        message: '导出报表失败',
      });
    },
  });

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: '查看详情',
        onClick: (row) => {
          const id = String(row.id);
          if (id) {
            navigate(`${REPORT_PATHS.viewer}/${id}`);
          }
        },
      },
      {
        key: 'export',
        label: '导出',
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
      { label: '报表总数', value: rows.length, icon: FileTextIcon, color: 'primary' },
      { label: '今日生成', value: today, icon: AnalyticsIcon, color: 'success' },
      { label: '定时任务', value: 0, icon: ClockIcon, color: 'warning' },
      { label: '订阅用户', value: 0, icon: UsersIcon, color: 'info' },
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
                    color={card.color as any}
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
      title='报表中心'
      subtitle='统一报表管理平台，支持多种报表类型和导出格式'
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
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '报表中心' }]}
      />
    </PageContainer>
  );
};

export default ReportListPage;
