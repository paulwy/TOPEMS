import type { EntitySchema } from '@/schema';

export const hazardSchema: EntitySchema = {
  entity: 'ehsHazard',
  title: '危险源管理',
  description: '管理企业危险源信息，包括类别、严重程度、风险等级、状态等',

  api: {
    module: 'ehs',
    resource: 'hazards',
  },

  fields: [
    {
      name: 'hazard_no',
      label: '危险源编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: '危险源名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      required: true,
      defaultValue: 'equipment',
      options: {
        type: 'static',
        options: [
          { value: 'equipment', label: '设备设施' },
          { value: 'chemical', label: '化学品' },
          { value: 'physical', label: '物理因素' },
          { value: 'biological', label: '生物因素' },
          { value: 'ergonomic', label: '人机工效' },
          { value: 'environmental', label: '环境因素' },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'severity',
      label: '严重程度',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'exposure',
      label: '暴露程度',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      showInList: false,
    },
    {
      name: 'likelihood',
      label: '可能性',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      showInList: false,
    },
    {
      name: 'level',
      label: '风险等级',
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'extreme', label: '极高' },
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const loc = row.location as string | null | undefined;
        return loc || '-';
      },
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'controlled', label: '已控制' },
          { value: 'eliminated', label: '已消除' },
          { value: 'archived', label: '已归档' },
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
    columns: ['name', 'category', 'severity', 'level', 'location', 'status'],
    searchFields: ['name', 'location'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'error',
        controlled: 'warning',
        eliminated: 'success',
        archived: 'default',
      },
      labelMap: {
        active: '活跃',
        controlled: '已控制',
        eliminated: '已消除',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'severity',
        label: '严重程度',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '高', value: 'high' },
          { label: '中', value: 'medium' },
          { label: '低', value: 'low' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '已控制', value: 'controlled' },
          { label: '已消除', value: 'eliminated' },
          { label: '已归档', value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['hazard_no', 'name', 'category', 'location'],
    },
    {
      title: '风险评估',
      fields: ['severity', 'exposure', 'likelihood', 'level'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 3,
  createTitle: '登记危险源',
  editTitle: '编辑危险源',
  detailTitle: '危险源详情',
};
