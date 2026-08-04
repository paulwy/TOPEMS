/**
 * 数据映射 Schema — 驱动 IntegrationMappingsPage 的 CrudPage
 *
 * 管理字段映射、数据转换、数据过滤、数据验证规则，
 * 支持创建、编辑、删除、启停、导入导出等操作。
 */

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import type { EntitySchema, SchemaField } from '@/schema';

export type MappingType = 'field' | 'transform' | 'filter' | 'validate';
export type MappingStatus = 'active' | 'inactive' | 'draft';

export const MAPPING_TYPE_LABELS: Record<MappingType, string> = {
  field: '字段映射',
  transform: '数据转换',
  filter: '数据过滤',
  validate: '数据验证',
};

export const MAPPING_TYPE_COLORS: Record<
  MappingType,
  'primary' | 'secondary' | 'warning' | 'error'
> = {
  field: 'primary',
  transform: 'secondary',
  filter: 'warning',
  validate: 'error',
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  active: '启用',
  inactive: '停用',
  draft: '草稿',
};

export const MAPPING_STATUS_COLORS: Record<MappingStatus, 'success' | 'default' | 'warning'> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
};

const mappingFields: SchemaField[] = [
  {
    name: 'name',
    label: '映射名称',
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
    label: '描述',
    type: 'textarea',
    showInList: false,
  },
  {
    name: 'type',
    label: '类型',
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
    label: '源表',
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
    label: '目标表',
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
    label: '字段数',
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
    label: '状态',
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
    label: '最后同步',
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
  title: '数据映射',
  description: '管理数据映射规则和转换逻辑',

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
        label: '类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          ...Object.entries(MAPPING_TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
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
      title: '基本信息',
      fields: ['name', 'description', 'type', 'status'],
    },
    {
      title: '映射配置',
      fields: ['source', 'target', 'fieldCount'],
    },
    {
      title: '同步信息',
      fields: ['lastSyncTime'],
    },
  ],

  formColCount: 2,
  createTitle: '新建映射规则',
  editTitle: '编辑映射规则',
  detailTitle: '映射规则详情',
};
