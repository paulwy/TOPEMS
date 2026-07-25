import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

function renderVersionCell(row: Record<string, unknown>) {
  const version = row.version as string | null | undefined;
  return React.createElement(Chip, {
    label: `v${version || ''}`,
    size: 'small',
    sx: { backgroundColor: 'secondary.100', color: 'secondary.dark' },
  });
}

function renderDateCell(row: Record<string, unknown>) {
  const val = row.created_at as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleString('zh-CN');
}

export const standardRevisionSchema: EntitySchema = {
  entity: 'qmsStandardRevision',
  title: '版本历史',
  description: '质量标准的版本变更记录',

  api: {
    module: 'qms',
    resource: 'revisions',
  },

  fields: [
    {
      name: 'id',
      label: 'ID',
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'version',
      label: '版本号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      renderCell: renderVersionCell,
    },
    {
      name: 'description',
      label: '变更说明',
      type: 'text',
      listWidth: 300,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      renderCell: renderDateCell,
    },
    {
      name: 'created_by',
      label: '创建人',
      type: 'text',
      readonly: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: ['version', 'description', 'created_at', 'created_by'],
    pageSize: 10,
    selectable: false,
  },

  formSections: [
    {
      title: '版本信息',
      fields: ['version', 'description'],
    },
  ],

  formColCount: 1,
  createTitle: '新建版本',
  editTitle: '编辑版本',
  detailTitle: '版本详情',

  actions: ['detail'],
};
