import type React from 'react';
import type { EntitySchema } from '@/schema';

export const processRouteSchema: EntitySchema = {
  entity: 'mesProcessRoute',
  title: '工艺路线',
  description: '管理生产工艺路线，包括路线编号、名称、版本、标准工时和状态',

  api: {
    module: 'mes',
    resource: 'processRoutes',
  },

  fields: [
    {
      name: 'code',
      label: '路线编号',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '路线名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'process_count',
      label: '工序数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
      readonly: true,
    },
    {
      name: 'total_standard_time',
      label: '总标准工时(分钟)',
      type: 'number',
      sortable: true,
      listWidth: 140,
      readonly: true,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const t = (row as Record<string, unknown>).total_standard_time as number | undefined;
        return t || 0;
      },
    },
    {
      name: 'standard_time',
      label: '标准工时(分钟)',
      type: 'number',
      listWidth: 130,
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
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
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      sortable: true,
      listWidth: 160,
      showInForm: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'version',
      'process_count',
      'total_standard_time',
      'status',
      'created_at',
    ],
    searchFields: ['code', 'name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        draft: 'warning',
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
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'inactive' },
          { label: '草稿', value: 'draft' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'version', 'status'],
    },
    {
      title: '工时信息',
      fields: ['standard_time'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增工艺路线',
  editTitle: '编辑工艺路线',
  detailTitle: '工艺路线详情',
};
