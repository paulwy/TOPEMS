import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  available: 'success',
  in_use: 'warning',
  maintenance: 'error',
  retired: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  available: '可用',
  in_use: '使用中',
  maintenance: '维护中',
  retired: '已退役',
};

const RESOURCE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'server', label: '服务器' },
  { value: 'database', label: '数据库' },
  { value: 'workstation', label: '工作站' },
  { value: 'hardware', label: '硬件' },
  { value: 'software', label: '软件' },
  { value: 'network', label: '网络设备' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'available', label: '可用' },
  { value: 'in_use', label: '使用中' },
  { value: 'maintenance', label: '维护中' },
  { value: 'retired', label: '已退役' },
];

export const resourceSchema: EntitySchema = {
  entity: 'pm_resource',
  title: '资源管理',
  description: '管理项目资源的分配与使用情况',

  api: {
    module: 'pm',
    resource: 'resources',
  },

  fields: [
    {
      name: 'resource_id',
      label: '资源标识',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'resource_type',
      label: '资源类型',
      type: 'select',
      required: true,
      defaultValue: 'server',
      options: { type: 'static', options: RESOURCE_TYPE_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'resource_service',
      label: '服务名称',
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'role',
      label: '角色',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'allocation_percent',
      label: '分配比例',
      type: 'number',
      defaultValue: 100,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.allocation_percent as number | undefined;
        if (val === undefined || val === null) return '-';
        return `${val}%`;
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'available',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'start_date',
      label: '分配开始',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '分配结束',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'actual_hours',
      label: '实际工时',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'actual_cost',
      label: '实际成本',
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'resource_id',
      'resource_type',
      'resource_service',
      'role',
      'allocation_percent',
      'status',
      'start_date',
      'end_date',
      'created_at',
    ],
    searchFields: ['resource_id', 'resource_service', 'resource_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'resource_type',
        label: '资源类型',
        type: 'select',
        options: [{ label: '全部类型', value: 'all' }, ...RESOURCE_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['resource_id', 'resource_type', 'resource_service', 'role'],
    },
    {
      title: '分配信息',
      fields: ['allocation_percent', 'status', 'start_date', 'end_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增资源',
  editTitle: '编辑资源',
  detailTitle: '资源详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
