import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

export const LIMS_QMS_STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  synced: { label: i18n.t('shared.lims_qms.k0'), color: 'success' },
  pending: { label: i18n.t('shared.lims_qms.k1'), color: 'warning' },
  failed: { label: i18n.t('shared.lims_qms.k2'), color: 'error' },
};

const limsQmsFields: SchemaField[] = [
  {
    name: 'sample_name',
    label: i18n.t('shared.lims_qms.k3'),
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
          {String(row.sample_name ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          ID: {String(row.lims_sample_id ?? '').slice(0, 8)}...
        </Typography>
      </Box>
    ),
  },
  {
    name: 'lims_sample_id',
    label: i18n.t('shared.lims_qms.limsid_4'),
    type: 'text',
    required: true,
    showInList: false,
    placeholder: i18n.t('shared.lims_qms.limsuuid_5'),
  },
  {
    name: 'inspection_result',
    label: i18n.t('shared.lims_qms.k6'),
    type: 'text',
    listWidth: 140,
    placeholder: i18n.t('shared.lims_qms.k7'),
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.inspection_result ?? '-')}
      </Typography>
    ),
  },
  {
    name: 'inspection_notes',
    label: i18n.t('shared.lims_qms.k8'),
    type: 'textarea',
    showInList: false,
    placeholder: i18n.t('shared.lims_qms.k9'),
  },
  {
    name: 'sync_status',
    label: i18n.t('shared.lims_qms.k10'),
    type: 'select',
    sortable: true,
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(LIMS_QMS_STATUS_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const cfg =
        LIMS_QMS_STATUS_CONFIG[row.sync_status as string] || LIMS_QMS_STATUS_CONFIG.pending;
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
    label: i18n.t('shared.lims_qms.k11'),
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
          : i18n.t('shared.lims_qms.k12')}
      </Typography>
    ),
  },
  {
    name: 'created_at',
    label: i18n.t('shared.lims_qms.k13'),
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

export const limsQmsSyncSchema: EntitySchema = {
  entity: 'integration_lims_qms_sync',
  title: i18n.t('shared.lims_qms.limsqms_14'),
  description: i18n.t('shared.lims_qms.k15'),

  api: {
    module: 'integration',
    resource: 'limsQmsSyncs',
  },

  fields: limsQmsFields,

  list: {
    searchFields: ['sample_name', 'lims_sample_id'],
    pageSize: 10,
  },

  actions: ['create', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.lims_qms.k16'),
      fields: ['lims_sample_id', 'sample_name', 'inspection_result', 'inspection_notes'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('shared.lims_qms.limsqms_17'),
  detailTitle: i18n.t('shared.lims_qms.k18'),
};
