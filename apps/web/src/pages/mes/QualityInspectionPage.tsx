import React, { useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Download, CheckCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { qualitySchema } from '@/schemas/mes';
import { qualityApi } from '@/api/mes/quality';
import type { QualityInspection } from '@/api/mes/quality';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;
const qualityApiAdapter: CrudApiAdapter<QualityInspection> = {
  list: async (params) => {
    const response = await qualityApi.listInspections({
      page: params?.page !== undefined ? params.page - 1 : 0,
      page_size: params?.pageSize ?? 10,
      search: params?.search as string | undefined,
      status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
    });
    if (!response.success || !response.data) {
      throw new Error(i18n.t('mes.quality_inspection_page.k0'));
    }
    return {
      data: response.data.inspections,
      total: response.data.total,
    };
  },
  create: async (data) => {
    const response = await qualityApi.createInspection(
      data as Parameters<typeof qualityApi.createInspection>[0]
    );
    if (!response.success) {
      throw new Error(response.message || i18n.t('mes.quality_inspection_page.k1'));
    }
    return response.data as unknown as QualityInspection;
  },
  update: async (id, data) => {
    const response = await qualityApi.updateInspection(
      id,
      data as Parameters<typeof qualityApi.updateInspection>[1]
    );
    if (!response.success) {
      throw new Error(response.message || i18n.t('mes.quality_inspection_page.k2'));
    }
    return response.data as unknown as QualityInspection;
  },
  delete: async (id) => {
    const response = await qualityApi.deleteInspection(id);
    if (!response.success) {
      throw new Error(response.message || i18n.t('mes.quality_inspection_page.k3'));
    }
  },
};
const QualityInspectionPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const handleBatchExport = useCallback(
    async (rows: QualityInspection[]) => {
      if (rows.length === 0) {
        addNotification({
          type: 'warning',
          title: i18n.t('mes.quality_inspection_page.hint'),
          message: i18n.t('mes.quality_inspection_page.please_select'),
        });
        return;
      }
      try {
        const ExcelJS = await import('exceljs');
        const typeLabelMap: Record<string, string> = {
          incoming: i18n.t('mes.quality_inspection_page.inspection'),
          process: i18n.t('mes.quality_inspection_page.type_process'),
          final: i18n.t('mes.quality_inspection_page.inspection_1'),
          outgoing: i18n.t('mes.quality_inspection_page.inspection_2'),
          patrol: i18n.t('mes.quality_inspection_page.patrol'),
        };
        const statusLabelMap: Record<string, string> = {
          pending: i18n.t('mes.quality_inspection_page.status_pending'),
          inspecting: i18n.t('mes.quality_inspection_page.status_in_progress'),
          passed: i18n.t('mes.quality_inspection_page.result_qualified'),
          failed: i18n.t('mes.quality_inspection_page.result_unqualified'),
          rework: i18n.t('mes.quality_inspection_page.text_98e01c'),
          scrapped: i18n.t('mes.quality_inspection_page.scrap'),
        };
        const exportData = rows.map((item) => ({
          [i18n.t('pages.quality_inspection_page.k0')]: item.inspection_no,
          [i18n.t('pages.quality_inspection_page.k1')]: item.order_number || '',
          [i18n.t('pages.quality_inspection_page.k2')]: item.product_code,
          [i18n.t('pages.quality_inspection_page.k3')]: item.product_name,
          [i18n.t('pages.quality_inspection_page.k4')]: item.process_name || '',
          [i18n.t('pages.quality_inspection_page.k5')]:
            typeLabelMap[item.inspection_type] || item.inspection_type,
          [i18n.t('pages.quality_inspection_page.k6')]: item.quantity,
          [i18n.t('pages.quality_inspection_page.k7')]: item.qualified_quantity,
          [i18n.t('pages.quality_inspection_page.k8')]: item.unqualified_quantity,
          [i18n.t('pages.quality_inspection_page.k9')]:
            `${item.qualification_rate?.toFixed(2) || 0}%`,
          [i18n.t('pages.quality_inspection_page.k10')]: item.inspector || '',
          [i18n.t('pages.quality_inspection_page.k11')]: item.inspection_time
            ? new Date(item.inspection_time).toLocaleString('zh-CN')
            : '',
          [i18n.t('pages.quality_inspection_page.k12')]: item.result || '',
          [i18n.t('pages.quality_inspection_page.k13')]: statusLabelMap[item.status] || item.status,
        }));
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(i18n.t('mes.quality_inspection_page.k4'));
        worksheet.addRows(exportData);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${i18n.t('pages.quality_inspection_page.__0')}${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        addNotification({
          type: 'success',
          title: i18n.t('mes.quality_inspection_page.export'),
          message: `${i18n.t('pages.quality_inspection_page.k1')}${rows.length}${i18n.t('pages.quality_inspection_page.k2')}`,
        });
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('mes.quality_inspection_page.export_2'),
          message: i18n.t('mes.quality_inspection_page.export_3'),
        });
      }
    },
    [addNotification]
  );
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'export-selected',
        label: i18n.t('mes.quality_inspection_page.batch_export_1'),
        icon: <Download size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => {
          handleBatchExport([row as unknown as QualityInspection]);
        },
      },
    ],
    [handleBatchExport]
  );
  const handleStatsExport = useCallback(
    (rows: Record<string, unknown>[]) => {
      handleBatchExport(rows as unknown as QualityInspection[]);
    },
    [handleBatchExport]
  );
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <CheckCircle style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={qualitySchema}
        apiAdapter={qualityApiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[
          {
            label: i18n.t('mes.quality_inspection_page.breadcrumb_home'),
            href: '/dashboard',
          },
          {
            label: 'MES',
            href: '/mes',
          },
          {
            label: i18n.t('mes.quality_inspection_page.breadcrumb_current'),
          },
        ]}
        headerContent={(rows) => {
          const items = rows as unknown as QualityInspection[];
          const totalQty = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
          const qualifiedQty = items.reduce(
            (sum, i) => sum + (Number(i.qualified_quantity) || 0),
            0
          );
          const avgRate = totalQty > 0 ? (qualifiedQty / totalQty) * 100 : 0;
          const stats = {
            total: items.length,
            pending: items.filter((i) => i.status === 'pending').length,
            passed: items.filter((i) => i.status === 'passed').length,
            failed: items.filter((i) => i.status === 'failed').length,
            avgRate,
          };
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(5, 1fr)',
                },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.quality_inspection_page.k14')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.total}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.quality_inspection_page.k15')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.pending}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.quality_inspection_page.k16')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.passed}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.quality_inspection_page.k17')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'error.dark' }}
                >
                  {stats.failed}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  bgcolor: ct.secondary[100],
                  borderRadius: 3,
                  cursor: 'pointer',
                }}
                onClick={() => handleStatsExport(rows)}
                title={i18n.t('mes.quality_inspection_page.batch_export_1')}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.quality_inspection_page.k18')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {stats.avgRate.toFixed(2)}%
                </Typography>
              </Box>
            </Box>
          );
        }}
        idField='id'
      />
    </PageContainer>
  );
};
export default QualityInspectionPage;
