import React from 'react';
import type { EntitySchema } from '@/schema';

export const processSchema: EntitySchema = {
  entity: 'limsProcess',
  title: '检验流程',
  description: '管理实验室检验流程，包括流程名称、描述、步骤和状态',

  api: {
    module: 'lims',
    resource: 'processes',
  },

  fields: [
    {
      name: 'name',
      label: '流程名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      listWidth: 250,
    },
    {
      name: 'steps',
      label: '步骤数',
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const steps = (row as Record<string, unknown>).steps as Array<unknown> | undefined;
        return steps?.length || 0;
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
          { value: 'draft', label: '草稿' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      sortable: true,
      listWidth: 130,
      showInForm: false,
    },
  ],

  list: {
    columns: ['name', 'description', 'steps', 'status', 'created_at'],
    searchFields: ['name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'warning',
        draft: 'default',
      },
      labelMap: {
        active: '启用',
        inactive: '禁用',
        draft: '草稿',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: '' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'inactive' },
          { label: '草稿', value: 'draft' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'description', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新建检验流程',
  editTitle: '编辑检验流程',
  detailTitle: '检验流程详情',
};
