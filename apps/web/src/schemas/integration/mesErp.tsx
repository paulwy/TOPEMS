import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

const MES_ERP_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: i18n.t('shared.mes_erp.k0'), color: 'success' },
  pending: { label: i18n.t('shared.mes_erp.k1'), color: 'warning' },
  failed: { label: i18n.t('shared.mes_erp.k2'), color: 'error' },
};

const mesErpFields: SchemaField[] = [
  {
    name: 'order_number',
    label: i18n.t('shared.mes_erp.k3'),
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 220,
    renderCell: (row: Record<string, unknown>) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {String(row.order_number ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.mes_order_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'mes_order_id',
    label: i18n.t('shared.mes_erp.mesid_4'),
    type: 'text',
    required: true,
    showInList: false,
    placeholder: i18n.t('shared.mes_erp.mesuuid_5'),
  },
  {
    name: 'product_name',
    label: i18n.t('shared.mes_erp.k6'),
    type: 'text',
    listWidth: 140,
    placeholder: i18n.t('shared.mes_erp.k7'),
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.product_name ?? '-')}
      </Typography>
    ),
  },
  {
    name: 'quantity',
    label: i18n.t('shared.mes_erp.k8'),
    type: 'number',
    sortable: true,
    listWidth: 100,
    placeholder: i18n.t('shared.mes_erp.k9'),
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>{String(row.quantity ?? '-')}</Typography>
    ),
  },
  {
    name: 'sync_status',
    label: i18n.t('shared.mes_erp.k10'),
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(MES_ERP_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = MES_ERP_STATUS_CONFIG[row.sync_status as string] || MES_ERP_STATUS_CONFIG.pending;
      return (
        <Chip
          size='small'
          color={cfg.color}
          label={cfg.label}
        />
      );
    },
  },
  {
    name: 'last_synced_at',
    label: i18n.t('shared.mes_erp.k11'),
    type: 'datetime',
    sortable: true,
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {row.last_synced_at
          ? new Date(String(row.last_synced_at)).toLocaleString('zh-CN')
          : i18n.t('shared.mes_erp.k12')}
      </Typography>
    ),
  },
  {
    name: 'created_at',
    label: i18n.t('shared.mes_erp.k13'),
    type: 'datetime',
    sortable: true,
    listWidth: 160,
    hideInForm: true,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {new Date(String(row.created_at)).toLocaleString('zh-CN')}
      </Typography>
    ),
  },
];

export const mesErpSyncSchema: EntitySchema = {
  entity: 'integration_mes_erp_sync',
  title: i18n.t('shared.mes_erp.meserp_14'),
  description: i18n.t('shared.mes_erp.k15'),

  api: {
    module: 'integration',
    resource: 'mesErpSyncs',
  },

  fields: mesErpFields,

  list: {
    searchFields: ['order_number', 'product_name', 'mes_order_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.mes_erp.k16'),
      fields: ['mes_order_id', 'order_number', 'product_name', 'quantity'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('shared.mes_erp.meserp_17'),
  detailTitle: i18n.t('shared.mes_erp.k18'),
};
