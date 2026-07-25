import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  draft: 'warning',
  expired: 'error',
  archived: 'default',
};

const statusLabelMap: Record<string, string> = {
  active: '有效',
  draft: '草稿',
  expired: '已过期',
  archived: '已归档',
};

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = statusColorMap[status] || 'default';
  const label = statusLabelMap[status] || status;
  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderVersionCell(row: Record<string, unknown>) {
  const version = row.version as string | null | undefined;
  return `v${version || '1.0'}`;
}

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const qualityStandardSchema: EntitySchema = {
  entity: 'qmsQualityStandard',
  title: '质量标准',
  description: '管理质量标准文件，包括标准编号、名称、分类、版本、状态和生效日期等',

  api: {
    module: 'qms',
    resource: 'standards',
    listMethod: 'listStandards',
    createMethod: 'createStandard',
    updateMethod: 'updateStandard',
    deleteMethod: 'deleteStandard',
  },

  fields: [
    {
      name: 'code',
      label: '标准编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: 'QS-XXXX-XXX',
    },
    {
      name: 'name',
      label: '标准名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: '请输入标准名称',
    },
    {
      name: 'category',
      label: '分类',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入分类',
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      listWidth: 100,
      renderCell: renderVersionCell,
      placeholder: '如 1.0',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '有效' },
          { value: 'draft', label: '草稿' },
          { value: 'expired', label: '已过期' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
    },
    {
      name: 'effective_date',
      label: '生效日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'effective_date'),
    },
    {
      name: 'created_at',
      label: '创建日期',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      showInList: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'description',
      label: '标准描述',
      type: 'textarea',
      showInList: false,
      placeholder: '请输入标准描述',
    },
    {
      name: 'content',
      label: '标准内容',
      type: 'textarea',
      showInList: false,
      showInDetail: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['code', 'name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '有效', value: 'active' },
          { label: '草稿', value: 'draft' },
          { label: '已过期', value: 'expired' },
          { label: '已归档', value: 'archived' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'version', 'status'],
    },
    {
      title: '其他信息',
      fields: ['effective_date', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增质量标准',
  editTitle: '编辑质量标准',
  detailTitle: '质量标准详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
