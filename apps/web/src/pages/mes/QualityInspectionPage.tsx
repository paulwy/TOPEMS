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
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

const qualityApiAdapter: CrudApiAdapter<QualityInspection> = {
  list: async (params) => {
    const response = await qualityApi.listInspections({
      page: params?.page !== undefined ? params.page - 1 : 0,
      pagesize: params?.pageSize ?? 10,
      search: params?.search as string | undefined,
      status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
    });
    if (!response.success || !response.data) {
      throw new Error('加载质量检验记录失败');
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
      throw new Error(response.message || '创建质量检验记录失败');
    }
    return response.data as unknown as QualityInspection;
  },

  update: async (id, data) => {
    const response = await qualityApi.updateInspection(
      id,
      data as Parameters<typeof qualityApi.updateInspection>[1]
    );
    if (!response.success) {
      throw new Error(response.message || '更新质量检验记录失败');
    }
    return response.data as unknown as QualityInspection;
  },

  delete: async (id) => {
    const response = await qualityApi.deleteInspection(id);
    if (!response.success) {
      throw new Error(response.message || '删除质量检验记录失败');
    }
  },
};

const QualityInspectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();

  const handleBatchExport = useCallback(
    async (rows: QualityInspection[]) => {
      if (rows.length === 0) {
        addNotification({
          type: 'warning',
          title: t('mes.quality_inspection_page.hint'),
          message: t('mes.quality_inspection_page.please_select'),
        });
        return;
      }

      try {
        const XLSX = await import('xlsx');
        const typeLabelMap: Record<string, string> = {
          incoming: t('mes.quality_inspection_page.inspection'),
          process: t('mes.quality_inspection_page.type_process'),
          final: t('mes.quality_inspection_page.inspection_1'),
          outgoing: t('mes.quality_inspection_page.inspection_2'),
          patrol: t('mes.quality_inspection_page.patrol'),
        };
        const statusLabelMap: Record<string, string> = {
          pending: t('mes.quality_inspection_page.status_pending'),
          inspecting: t('mes.quality_inspection_page.status_in_progress'),
          passed: t('mes.quality_inspection_page.result_qualified'),
          failed: t('mes.quality_inspection_page.result_unqualified'),
          rework: t('mes.quality_inspection_page.text_98e01c'),
          scrapped: t('mes.quality_inspection_page.scrap'),
        };

        const exportData = rows.map((item) => ({
          检验单号: item.inspection_no,
          生产订单: item.order_number || '',
          产品编码: item.product_code,
          产品名称: item.product_name,
          工序: item.process_name || '',
          检验类型: typeLabelMap[item.inspection_type] || item.inspection_type,
          检验数量: item.quantity,
          合格数: item.qualified_quantity,
          不合格数: item.unqualified_quantity,
          合格率: `${item.qualification_rate?.toFixed(2) || 0}%`,
          检验员: item.inspector || '',
          检验时间: item.inspection_time
            ? new Date(item.inspection_time).toLocaleString('zh-CN')
            : '',
          检验结果: item.result || '',
          状态: statusLabelMap[item.status] || item.status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '质检记录');
        XLSX.writeFile(workbook, `质检记录_${new Date().toISOString().split('T')[0]}.xlsx`);

        addNotification({
          type: 'success',
          title: t('mes.quality_inspection_page.export'),
          message: `已导出 ${rows.length} 条质检记录`,
        });
      } catch (error: unknown) {
        addNotification({
          type: 'error',
          title: t('mes.quality_inspection_page.export_2'),
          message: t('mes.quality_inspection_page.export_3'),
        });
      }
    },
    [addNotification, t]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'export-selected',
        label: t('mes.quality_inspection_page.batch_export_1'),
        icon: <Download size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => {
          handleBatchExport([row as unknown as QualityInspection]);
        },
      },
    ],
    [handleBatchExport, t]
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
            label: t('mes.quality_inspection_page.breadcrumb_home'),
            href: '/dashboard',
          },
          {
            label: 'MES',
            href: '/mes',
          },
          {
            label: t('mes.quality_inspection_page.breadcrumb_current'),
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
                  总检验数
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
                  待检验
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
                  合格数
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
                  不合格数
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
                title={t('mes.quality_inspection_page.batch_export_1')}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  平均合格率
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
