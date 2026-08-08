import type React from 'react';
import type { EntitySchema } from '@/schema';

export const productionProcessSchema: EntitySchema = {
  entity: 'productionProcess',
  title: '工序管理',
  description: '管理生产工序，包括工序名称、编码、顺序、标准工时、工作站等',

  api: {
    module: 'mes',
    resource: 'processes',
  },

  fields: [
    {
      name: 'name',
      label: '工序名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: '工序编码',
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'sequence',
      label: '顺序',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 80,
    },
    {
      name: 'standard_time',
      label: '标准工时(h)',
      type: 'number',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const t = row.standard_time as number | undefined;
        return t ? `${t}h` : '-';
      },
    },
    {
      name: 'work_station_id',
      label: '工作站',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>): React.ReactNode => {
        const ws = row.work_station_id as string | undefined;
        return ws || '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '已启用' },
          { value: 'inactive', label: '已禁用' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'sequence', 'standard_time', 'work_station_id', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: '已启用',
        inactive: '已禁用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: '' },
          { label: '已启用', value: 'active' },
          { label: '已禁用', value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'sequence'],
    },
    {
      title: '工时与工作站',
      fields: ['standard_time', 'work_station_id'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增工序',
  editTitle: '编辑工序',
  detailTitle: '工序详情',
};
