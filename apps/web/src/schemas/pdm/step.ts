import type { EntitySchema } from '@/schema';

export const stepSchema: EntitySchema = {
  entity: 'pdm_step',
  title: '工序步骤',
  description: '管理生产工序步骤，包括步骤编号、名称、排序、耗时、所需设备、状态等',

  api: {
    module: 'pdm',
    resource: 'steps',
  },

  fields: [
    {
      name: 'step_no',
      label: '步骤编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '步骤名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'process_id',
      label: '所属工艺',
      type: 'text',
      required: true,
      showInList: false,
      placeholder: '请输入工艺ID',
    },
    {
      name: 'sort_order',
      label: '排序序号',
      type: 'number',
      defaultValue: 1,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'duration_hours',
      label: '耗时(小时)',
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'equipment_required',
      label: '所需设备',
      type: 'text',
      listWidth: 160,
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
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
  ],

  list: {
    columns: ['step_no', 'name', 'sort_order', 'duration_hours', 'equipment_required', 'status'],
    searchFields: ['step_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
      },
      labelMap: {
        active: '启用',
        inactive: '禁用',
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
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['step_no', 'name', 'process_id', 'sort_order'],
    },
    {
      title: '生产信息',
      fields: ['duration_hours', 'equipment_required', 'status'],
    },
    {
      title: '其他',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增工序步骤',
  editTitle: '编辑工序步骤',
  detailTitle: '工序步骤详情',
};
