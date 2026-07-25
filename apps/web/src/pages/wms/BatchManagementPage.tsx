import React from 'react';
import { Box, Chip } from '@mui/material';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import { Layers, ArrowRightLeft } from 'lucide-react';
import { batchSchema } from '@/schemas/wms/batch';
import { wmsApi } from '@/api/wms';
import type { Batch } from '@/api/wms';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const BatchManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();

  const statusConfig: Record<
    string,
    { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
  > = {
    in_stock: { label: t('wms.batch_management_page.text_a230ce'), color: 'success' },
    out_stock: { label: t('wms.batch_management_page.outbound'), color: 'default' },
    reserved: { label: t('wms.batch_management_page.text_ba07b1'), color: 'warning' },
    frozen: { label: t('wms.batch_management_page.text_28a286'), color: 'error' },
    scrapped: { label: t('wms.batch_management_page.scrap'), color: 'default' },
  };

  const isExpiringSoon = (batch: Batch) => {
    if (!batch.expiry_date || !batch.shelf_life_days) return false;
    const expiryDate = new Date(batch.expiry_date);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (batch: Batch) => {
    if (!batch.expiry_date) return false;
    return new Date(batch.expiry_date) < new Date();
  };

  const customColumns: ColumnDef[] = [
    {
      id: 'batch_no',
      label: t('wms.batch_management_page.column_batch_number'),
      width: 140,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return (
          <Box sx={{ fontWeight: 500 }}>
            {batch.batch_no}
            {isExpired(batch) && (
              <Chip
                size='small'
                label={t('wms.batch_management_page.status_expired')}
                color='error'
                sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
              />
            )}
            {isExpiringSoon(batch) && !isExpired(batch) && (
              <Chip
                size='small'
                label={t('wms.batch_management_page.text_2cae05')}
                color='warning'
                sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
              />
            )}
          </Box>
        );
      },
    },
    {
      id: 'material_info',
      label: t('wms.batch_management_page.info'),
      width: 180,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return (
          <Box>
            <Box sx={{ fontWeight: 500 }}>{batch.material_name}</Box>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>SKU: {batch.sku}</Box>
            {batch.specification && (
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{batch.specification}</Box>
            )}
          </Box>
        );
      },
    },
    {
      id: 'quantity',
      label: t('wms.batch_management_page.column_quantity'),
      width: 120,
      align: 'right',
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return (
          <Box>
            <Box sx={{ fontWeight: 500 }}>
              {batch.quantity.toLocaleString()} {batch.unit}
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              可用: {batch.available_quantity.toLocaleString()}
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'location',
      label: t('wms.batch_management_page.location'),
      width: 140,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return batch.location_code || batch.warehouse_name || '-';
      },
    },
    {
      id: 'supplier_name',
      label: t('wms.batch_management_page.supplier'),
      width: 140,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return batch.supplier_name || '-';
      },
    },
    {
      id: 'production_date',
      label: t('wms.batch_management_page.field_production_date'),
      width: 120,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return batch.production_date
          ? new Date(batch.production_date).toLocaleDateString('zh-CN')
          : '-';
      },
    },
    {
      id: 'expiry_date',
      label: t('wms.batch_management_page.field_expiry_date'),
      width: 140,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        return (
          <Box
            sx={{
              color: isExpired(batch)
                ? 'error.main'
                : isExpiringSoon(batch)
                  ? 'warning.main'
                  : 'inherit',
            }}
          >
            {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('zh-CN') : '-'}
            {batch.remaining_days !== undefined && batch.remaining_days >= 0 && (
              <Box sx={{ fontSize: '0.75rem' }}>剩余 {batch.remaining_days} 天</Box>
            )}
          </Box>
        );
      },
    },
    {
      id: 'quality_status',
      label: t('wms.batch_management_page.status'),
      width: 100,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        const qualityStatusConfig: Record<
          string,
          { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
        > = {
          qualified: { label: t('wms.batch_management_page.qualified'), color: 'success' },
          unqualified: { label: t('wms.batch_management_page.unqualified'), color: 'error' },
          pending: { label: t('wms.batch_management_page.text_5930e6'), color: 'warning' },
          inspecting: { label: t('wms.batch_management_page.inspection'), color: 'primary' },
        };
        const config = qualityStatusConfig[batch.quality_status] || qualityStatusConfig.pending;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
            variant='outlined'
          />
        );
      },
    },
    {
      id: 'status',
      label: t('wms.batch_management_page.filter_status'),
      width: 100,
      render: (row: Record<string, unknown>) => {
        const batch = row as unknown as Batch;
        const config = statusConfig[batch.status] || statusConfig.in_stock;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
          />
        );
      },
    },
  ];

  const customRowActions: RowAction[] = [
    {
      label: t('wms.batch_management_page.transfer'),
      icon: <ArrowRightLeft size={14} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: t('wms.batch_management_page.hint'),
          message: t('wms.batch_management_page.transfer_1'),
        });
      },
    },
  ];

  const apiAdapter: CrudApiAdapter = {
    list: async (params) => {
      const response = await wmsApi.batches.list({
        page: params?.page ? params.page + 1 : 1,
        pagesize: params?.pageSize || 10,
        ...params,
      });
      if (!response.success) {
        throw new Error('Failed to fetch batches');
      }
      return {
        data: response.data.items as unknown as Record<string, unknown>[],
        total: response.data.total,
      };
    },
    create: async (data) => {
      const response = await wmsApi.batches.create(data as any);
      if (!response.success) {
        throw new Error('Failed to create batch');
      }
      return response.data as unknown as Record<string, unknown>;
    },
    update: async (id, data) => {
      const response = await wmsApi.batches.update(id, data as any);
      if (!response.success) {
        throw new Error('Failed to update batch');
      }
      return response.data as unknown as Record<string, unknown>;
    },
    delete: async (id) => {
      const response = await wmsApi.batches.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete batch');
      }
    },
  };

  return (
    <PageContainer
      title={t('wms.batch_management_page.breadcrumb_current')}
      subtitle={t('wms.batch_management_page.status_1')}
      maxWidth='xl'
      headerProps={{
        pageIcon: <Layers style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main}, ${ct.warning.dark})`,
      }}
    >
      <CrudPage
        schema={batchSchema}
        apiAdapter={apiAdapter}
        customColumns={customColumns}
        customRowActions={customRowActions}
        breadcrumbs={[{ label: t('wms.batch_management_page.breadcrumb_current') }]}
      />
    </PageContainer>
  );
};

export default BatchManagementPage;
