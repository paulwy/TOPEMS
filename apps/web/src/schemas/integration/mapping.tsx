/**
 * 数据映射 Schema — 驱动 IntegrationMappingsPage 的 CrudPage
 *
 * 管理字段映射、数据转换、数据过滤、数据验证规则，
 * 支持创建、编辑、删除、启停、导入导出等操作。
 */

import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';
import i18n from '@/i18n';

export type MappingType = 'field' | 'transform' | 'filter' | 'validate';
export type MappingStatus = 'active' | 'inactive' | 'draft';

export const MAPPING_TYPE_LABELS: Record<MappingType, string> = {
  field: i18n.t('shared.mapping.k0'),
  transform: i18n.t('shared.mapping.k1'),
  filter: i18n.t('shared.mapping.k2'),
  validate: i18n.t('shared.mapping.k3'),
};

const MAPPING_TYPE_COLORS: Record<MappingType, 'primary' | 'secondary' | 'warning' | 'error'> = {
  field: 'primary',
  transform: 'secondary',
  filter: 'warning',
  validate: 'error',
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  active: i18n.t('shared.mapping.k4'),
  inactive: i18n.t('shared.mapping.k5'),
  draft: i18n.t('shared.mapping.k6'),
};

const MAPPING_STATUS_COLORS: Record<MappingStatus, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
};

const mappingFields: SchemaField[] = [
  {
    name: 'name',
    label: i18n.t('shared.mapping.k7'),
    type: 'text',
    required: true,
    sortable: true,
    listWidth: 200,
    renderCell: (row: Record<string, unknown>) => (
      <Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {String(row.name ?? '')}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {String(row.description ?? '')}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'description',
    label: i18n.t('shared.mapping.k8'),
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'type',
    label: i18n.t('shared.mapping.k9'),
    type: 'select',
    required: true,
    listWidth: 110,
    options: {
      type: 'static',
      options: Object.entries(MAPPING_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const t = row.type as MappingType;
      return (
        <Chip
          size='small'
          color={MAPPING_TYPE_COLORS[t]}
          label={MAPPING_TYPE_LABELS[t]}
        />
      );
    },
  },
  {
    name: 'source',
    label: i18n.t('shared.mapping.k10'),
    type: 'text',
    listWidth: 140,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.source ?? '')}
      </Typography>
    ),
  },
  {
    name: 'target',
    label: i18n.t('shared.mapping.k11'),
    type: 'text',
    listWidth: 140,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.target ?? '')}
      </Typography>
    ),
  },
  {
    name: 'fieldCount',
    label: i18n.t('shared.mapping.k12'),
    type: 'number',
    align: 'center',
    listWidth: 90,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        sx={{ fontWeight: 500 }}
      >
        {String(row.fieldCount ?? 0)}
      </Typography>
    ),
  },
  {
    name: 'status',
    label: i18n.t('shared.mapping.k13'),
    type: 'select',
    listWidth: 100,
    options: {
      type: 'static',
      options: Object.entries(MAPPING_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    renderCell: (row: Record<string, unknown>) => {
      const s = row.status as MappingStatus;
      return (
        <Chip
          size='small'
          color={MAPPING_STATUS_COLORS[s]}
          variant='outlined'
          label={MAPPING_STATUS_LABELS[s]}
        />
      );
    },
  },
  {
    name: 'lastSyncTime',
    label: i18n.t('shared.mapping.k14'),
    type: 'datetime',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {String(row.lastSyncTime ?? '')}
      </Typography>
    ),
  },
];

export const integrationMappingSchema: EntitySchema = {
  entity: 'integration_mapping',
  title: i18n.t('shared.mapping.k15'),
  description: i18n.t('shared.mapping.k16'),

  api: {
    module: 'integration',
    resource: 'mappings',
  },

  fields: mappingFields,

  list: {
    searchFields: ['name', 'source', 'target'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.mapping.k17'),
        type: 'select',
        options: [
          { label: i18n.t('shared.mapping.k18'), value: 'all' },
          ...Object.entries(MAPPING_TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.mapping.k19'),
        type: 'select',
        options: [
          { label: i18n.t('shared.mapping.k20'), value: 'all' },
          ...Object.entries(MAPPING_STATUS_LABELS).map(([value, label]) => ({
            label,
            value,
          })),
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.mapping.k21'),
      fields: ['name', 'description', 'type', 'status'],
    },
    {
      title: i18n.t('shared.mapping.k22'),
      fields: ['source', 'target', 'fieldCount'],
    },
    {
      title: i18n.t('shared.mapping.k23'),
      fields: ['lastSyncTime'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.mapping.k24'),
  editTitle: i18n.t('shared.mapping.k25'),
  detailTitle: i18n.t('shared.mapping.k26'),
};
