import type { EntitySchema } from '@/schema';

export const workstationSchema: EntitySchema = {
  entity: 'workstation',
  title: '工作站管理',
  description: '管理生产工作站，包括工作站名称、编码、位置、容量、状态等',

  api: {
    module: 'mes',
    resource: 'workstations',
  },

  fields: [
    {
      name: 'name',
      label: '工作站名称',
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'code',
      label: '编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'capacity',
      label: '容量',
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'supervisor',
      label: '负责人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'idle',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '运行中' },
          { value: 'idle', label: '空闲' },
          { value: 'maintenance', label: '维护中' },
          { value: 'offline', label: '离线' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['name', 'code', 'location', 'capacity', 'supervisor', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        idle: 'warning',
        maintenance: 'info',
        offline: 'error',
      },
      labelMap: {
        active: '运行中',
        idle: '空闲',
        maintenance: '维护中',
        offline: '离线',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: '' },
          { label: '运行中', value: 'active' },
          { label: '空闲', value: 'idle' },
          { label: '维护中', value: 'maintenance' },
          { label: '离线', value: 'offline' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'location'],
    },
    {
      title: '产能与人员',
      fields: ['capacity', 'supervisor'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '创建工作站',
  editTitle: '编辑工作站',
  detailTitle: '工作站详情',
};
