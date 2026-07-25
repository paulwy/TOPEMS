import type { EntitySchema } from '@/schema';

export const equipmentSchema: EntitySchema = {
  entity: 'mes_equipment',
  title: '设备管理',
  description: '管理生产设备，包括编码、名称、型号、位置、状态等',

  api: {
    module: 'mes',
    resource: 'equipment',
  },

  fields: [
    {
      name: 'code',
      label: '设备编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '设备名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'type',
      label: '设备类型',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'cnc', label: '数控机床' },
          { value: 'assembly', label: '装配设备' },
          { value: 'testing', label: '检测设备' },
          { value: 'packaging', label: '包装设备' },
          { value: 'conveyor', label: '输送设备' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'model',
      label: '型号',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'manufacturer',
      label: '制造商',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'purchase_date',
      label: '采购日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'location',
      label: '位置',
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
          { value: 'idle', label: '空闲' },
          { value: 'running', label: '运行中' },
          { value: 'maintenance', label: '维护中' },
          { value: 'fault', label: '故障' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'value',
      label: '价值',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'type', 'model', 'location', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        running: 'success',
        idle: 'default',
        maintenance: 'warning',
        fault: 'error',
      },
      labelMap: {
        running: '运行中',
        idle: '空闲',
        maintenance: '维护中',
        fault: '故障',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '运行中', value: 'running' },
          { label: '空闲', value: 'idle' },
          { label: '维护中', value: 'maintenance' },
          { label: '故障', value: 'fault' },
        ],
      },
      {
        id: 'type',
        label: '设备类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '数控机床', value: 'cnc' },
          { label: '装配设备', value: 'assembly' },
          { label: '检测设备', value: 'testing' },
          { label: '包装设备', value: 'packaging' },
          { label: '输送设备', value: 'conveyor' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'type', 'model', 'manufacturer'],
    },
    {
      title: '位置与采购',
      fields: ['location', 'purchase_date', 'value'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增设备',
  editTitle: '编辑设备',
  detailTitle: '设备详情',
};
