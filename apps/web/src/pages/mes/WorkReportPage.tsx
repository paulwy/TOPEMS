import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter, type RowAction } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workReportSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';
const ct= designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.workReports, {
  itemsField: 'reports',
});
const WorkReportPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const handleApprove = useCallback(
    async (id: string) => {
      try {
        const response = await mesApi.workReports.approve(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('mes.work_report_page.k0'),
            message: i18n.t('mes.work_report_page.k1'),
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MES_WORK_REPORT_BASE ,
  exact: false,
  refetchType: 'active',
});
        } else {
          addNotification({
            type: 'error',
            title: i18n.t('mes.work_report_page.k2'),
            message: response.message || i18n.t('mes.work_report_page.k3'),
          });
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('mes.work_report_page.k4'),
          message: err instanceof Error ? err.message : i18n.t('mes.work_report_page.k5'),
        });
      }
    },
    [addNotification, queryClient]
  );
  const handleReject = useCallback(
    async (id: string) => {
      try {
        const response = await mesApi.workReports.reject(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('mes.work_report_page.k6'),
            message: i18n.t('mes.work_report_page.k7'),
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MES_WORK_REPORT_BASE ,
  exact: false,
  refetchType: 'active',
});
        } else {
          addNotification({
            type: 'error',
            title: i18n.t('mes.work_report_page.k8'),
            message: response.message || i18n.t('mes.work_report_page.k9'),
          });
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: i18n.t('mes.work_report_page.k10'),
          message: err instanceof Error ? err.message : i18n.t('mes.work_report_page.k11'),
        });
      }
    },
    [addNotification, queryClient]
  );
  const customRowActions: RowAction[] = [
    {
      label: i18n.t('mes.work_report_page.k12'),
      icon: <CheckCircle size={16} />,
      color: 'success',
      onClick: (row: Record<string, unknown>) => handleApprove(String(row.id)),
      show: (row: Record<string, unknown>) => row.status === 'submitted',
    },
    {
      label: i18n.t('mes.work_report_page.k13'),
      icon: <XCircle size={16} />,
      color: 'error',
      onClick: (row: Record<string, unknown>) => handleReject(String(row.id)),
      show: (row: Record<string, unknown>) => row.status === 'submitted',
    },
  ];
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={workReportSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.work_report_page.k14') }]}
        customRowActions={customRowActions}
        headerContent={(rows) => {
          const total = rows.length;
          const draft = rows.filter((r) => r.status === 'draft').length;
          const submitted = rows.filter((r) => r.status === 'submitted').length;
          const approved = rows.filter((r) => r.status === 'approved').length;
          const totalGood = rows.reduce((sum, r) => sum + (Number(r.quantity_good) || 0), 0);
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.work_report_page.k0')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.work_report_page.k1')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {draft}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.work_report_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {submitted}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.work_report_page.k3')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {approved}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.work_report_page.k4')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {totalGood}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </PageContainer>
  );
};
export default WorkReportPage;