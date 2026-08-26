import { designTokens } from '@topems/tokens';
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
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(wmsApi.serialNumbers);

const qualityStatusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  qualified: { label: i18n.t('pages.serial_number_page.k0'), color: 'success' },
  unqualified: { label: i18n.t('pages.serial_number_page.k1'), color: 'error' },
  pending: { label: i18n.t('pages.serial_number_page.k2'), color: 'warning' },
  inspecting: { label: i18n.t('pages.serial_number_page.k3'), color: 'primary' },
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
    label: i18n.t('pages.serial_number_page.k4'),
    width: 160,
    render: (row: Record<string, unknown>) => (
      <Box sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
        {row.serial_no as string}
        {isWarrantyExpiringSoon(row) && (
          <Chip
            size='small'
            label={i18n.t('pages.serial_number_page.k5')}
            color='warning'
            sx={{ ml: 1, fontSize: designTokens.typography.fontSize.scale['0.625rem'], height: 16 }}
          />
        )}
      </Box>
    ),
  },
  {
    id: 'material_info',
    label: i18n.t('pages.serial_number_page.k6'),
    width: 160,
    render: (row: Record<string, unknown>) => (
      <Box>
        <Box sx={{ fontWeight: 500 }}>{row.material_name as string}</Box>
        <Box
          sx={{
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            color: 'text.secondary',
          }}
        >
          SKU: {row.sku as string}
        </Box>
      </Box>
    ),
  },
  {
    id: 'quality_status',
    label: i18n.t('pages.serial_number_page.k7'),
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
    label: i18n.t('pages.serial_number_page.k8'),
    width: 140,
    render: (row: Record<string, unknown>) => (
      <Box sx={{ fontSize: designTokens.typography.fontSize.scale['0.8rem'] }}>
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
      label: i18n.t('pages.serial_number_page.k9'),
      icon: <History size={14} />,
      onClick: async (row: Record<string, unknown>) => {
        try {
          const response = await wmsApi.serialNumbers.getTrace(row.id as string);
          if (response.success) {
            addNotification({
              type: 'info',
              title: i18n.t('pages.serial_number_page.k10'),
              message: `${i18n.t('pages.serial_number_page.k0')}${row.serial_no}${i18n.t('pages.serial_number_page.k1')}${response.data?.length || 0}${i18n.t('pages.serial_number_page.k2')}`,
            });
          }
        } catch (error: unknown) {
          apiLogger.error(i18n.t('pages.serial_number_page.k11'), error);
          addNotification({
            type: 'error',
            title: i18n.t('pages.serial_number_page.k12'),
            message: i18n.t('pages.serial_number_page.k13'),
          });
        }
      },
    },
    {
      key: 'transfer',
      label: i18n.t('pages.serial_number_page.k14'),
      icon: <ArrowRightLeft size={14} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: i18n.t('pages.serial_number_page.k15'),
          message: i18n.t('pages.serial_number_page.k16'),
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
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.serial_number_page.k17') }]}
    />
  );
}
