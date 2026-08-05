import React from 'react';
import { Box, Chip } from '@mui/material';
import { History, ArrowRightLeft } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { serialNumberSchema } from '@/schemas/wms';
import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';

const apiAdapter = createCrudPageAdapter(wmsApi.serialNumbers);

const qualityStatusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  qualified: { label: '合格', color: 'success' },
  unqualified: { label: '不合格', color: 'error' },
  pending: { label: '待检', color: 'warning' },
  inspecting: { label: '检验中', color: 'primary' },
};

function isWarrantyExpiringSoon(row: Record<string, unknown>): boolean {
  const endDate = row.warranty_end_date as string | undefined;
  if (!endDate) return false;
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 90 && diffDays > 0;
}

const customColumns: ColumnDef[] = [
  {
    id: 'serial_no',
    label: '序列号',
    width: 160,
    render: (row: Record<string, unknown>) => (
      <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
        {row.serial_no as string}
        {isWarrantyExpiringSoon(row) && (
          <Chip
            size='small'
            label='即将到期'
            color='warning'
            sx={{ ml: 1, fontSize: '0.625rem', height: 16 }}
          />
        )}
      </Box>
    ),
  },
  {
    id: 'material_info',
    label: '物料信息',
    width: 160,
    render: (row: Record<string, unknown>) => (
      <Box>
        <Box sx={{ fontWeight: 500 }}>{row.material_name as string}</Box>
        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>SKU: {row.sku as string}</Box>
      </Box>
    ),
  },
  {
    id: 'quality_status',
    label: '质检状态',
    width: 100,
    render: (row: Record<string, unknown>) => {
      const config =
        qualityStatusConfig[row.quality_status as string] || qualityStatusConfig.pending;
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
    id: 'warranty',
    label: '质保期',
    width: 140,
    render: (row: Record<string, unknown>) => (
      <Box sx={{ fontSize: '0.8rem' }}>
        {row.warranty_start_date && row.warranty_end_date ? (
          <>
            <Box>{new Date(row.warranty_start_date as string).toLocaleDateString('zh-CN')} ~</Box>
            <Box>{new Date(row.warranty_end_date as string).toLocaleDateString('zh-CN')}</Box>
          </>
        ) : (
          '-'
        )}
      </Box>
    ),
  },
];

export default function SerialNumberPage() {
  const { addNotification } = useNotificationStore();

  const customRowActions: RowAction[] = [
    {
      key: 'trace',
      label: '追溯',
      icon: <History size={14} />,
      onClick: async (row: Record<string, unknown>) => {
        try {
          const response = await wmsApi.serialNumbers.getTrace(row.id as string);
          if (response.success) {
            addNotification({
              type: 'info',
              title: '追溯信息',
              message: `序列号 ${row.serial_no} 共有 ${response.data?.length || 0} 条追溯记录`,
            });
          }
        } catch (error: unknown) {
          apiLogger.error('追溯查询失败', error);
          addNotification({
            type: 'error',
            title: '追溯失败',
            message: '无法获取追溯记录',
          });
        }
      },
    },
    {
      key: 'transfer',
      label: '移库',
      icon: <ArrowRightLeft size={14} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: '提示',
          message: '移库功能开发中',
        });
      },
    },
  ];

  return (
    <CrudPage
      schema={serialNumberSchema as EntitySchema & SchemaExtensions}
      apiAdapter={apiAdapter}
      customColumns={customColumns}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: 'WMS' }, { label: '序列号管理' }]}
    />
  );
}
