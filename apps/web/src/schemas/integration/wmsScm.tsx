import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

const WMS_SCM_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: i18n.t('shared.wms_scm.k0'), color: 'success' },
  pending: { label: i18n.t('shared.wms_scm.k1'), color: 'warning' },
  failed: { label: i18n.t('shared.wms_scm.k2'), color: 'error' },
};

const wmsScmFields: SchemaField[] = [
  {
    name: 'item_name',
    label: i18n.t('shared.wms_scm.k3'),
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 240,
    renderCell: (row: Record<string, unknown>) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {String(row.item_name ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.wms_inventory_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'wms_inventory_id',
    label: i18n.t('shared.wms_scm.wmsid_4'),
    type: 'text',
    required: true,
    showInList: false,
    placeholder: i18n.t('shared.wms_scm.wmsuuid_5'),
  },
  {
    name: 'quantity',
    label: i18n.t('shared.wms_scm.k6'),
    type: 'number',
    sortable: true,
    listWidth: 120,
    placeholder: i18n.t('shared.wms_scm.k7'),
    renderCell: (row: Record<string, unknown>) => (
      <Typography variant='body2'>
        {String(row.quantity ?? '-')} {String(row.unit ?? '')}
      </Typography>
    ),
  },
  {
    name: 'unit',
    label: i18n.t('shared.wms_scm.k8'),
    type: 'text',
    showInList: false,
    placeholder: i18n.t('shared.wms_scm.k9'),
  },
  {
    name: 'sync_status',
    label: i18n.t('shared.wms_scm.k10'),
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(WMS_SCM_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg = WMS_SCM_STATUS_CONFIG[row.sync_status as string] || WMS_SCM_STATUS_CONFIG.pending;
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
    label: i18n.t('shared.wms_scm.k11'),
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
          : i18n.t('shared.wms_scm.k12')}
      </Typography>
    ),
  },
  {
    name: 'created_at',
    label: i18n.t('shared.wms_scm.k13'),
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

export const wmsScmSyncSchema: EntitySchema = {
  entity: 'integration_wms_scm_sync',
  title: i18n.t('shared.wms_scm.wmsscm_14'),
  description: i18n.t('shared.wms_scm.wmsscm_15'),

  api: {
    module: 'integration',
    resource: 'wmsScmSyncs',
  },

  fields: wmsScmFields,

  list: {
    searchFields: ['item_name', 'wms_inventory_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.wms_scm.k16'),
      fields: ['wms_inventory_id', 'item_name', 'quantity', 'unit'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('shared.wms_scm.wmsscm_17'),
  detailTitle: i18n.t('shared.wms_scm.k18'),
};
