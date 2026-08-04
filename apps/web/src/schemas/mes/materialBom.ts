import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const materialBomSchema: EntitySchema = {
  entity: 'mes_material_bom',
  title: '物料BOM',
  description: '管理物料清单（BOM），包括产品信息、版本、状态和BOM子项',

  api: {
    module: 'mes',
    resource: 'boms',
  },

  fields: [
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: '产品名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      sortable: true,
      listWidth: 80,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
          { value: 'obsolete', label: '作废' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const statusMap: Record<string, { label: string; bg: string; color: string }> = {
          draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
          active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
          inactive: { label: '停用', bg: 'warning.light', color: 'warning.700' },
          obsolete: { label: '作废', bg: 'error.lighter', color: 'error.dark' },
        };
        const s = statusMap[(row.status as string) || 'draft'] || {
          label: row.status,
          bg: 'grey.100',
          color: 'text.secondary',
        };
        return React.createElement(Chip, {
          size: 'small',
          label: s.label,
          sx: { backgroundColor: s.bg, color: s.color, fontWeight: 500 },
        });
      },
    },
    {
      name: 'items_count',
      label: '子项数',
      type: 'number',
      readonly: true,
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) =>
        (row.items as unknown[] | undefined)?.length || 0,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'items',
      label: 'BOM子项',
      type: 'textarea',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['product_code', 'product_name', 'version', 'status', 'items_count', 'created_at'],
    searchFields: ['product_code', 'product_name'],
    pageSize: 10,
    selectable: true,
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '作废', value: 'obsolete' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['product_code', 'product_name', 'version', 'status'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新建BOM',
  editTitle: '编辑BOM',
  detailTitle: 'BOM详情',
};
