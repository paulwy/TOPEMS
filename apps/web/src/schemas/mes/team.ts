import type { EntitySchema } from '@/schema';

export const teamSchema: EntitySchema = {
  entity: 'team',
  title: '班组管理',
  api: {
    module: 'mes',
    resource: 'teams',
  },
  fields: [
    {
      name: 'team_code',
      label: '班组编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
      sortable: true,
    },
    {
      name: 'team_name',
      label: '班组名称',
      type: 'text',
      required: true,
      listWidth: 160,
      sortable: true,
    },
    {
      name: 'team_type',
      label: '班组类型',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'production', label: '生产班组' },
          { value: 'maintenance', label: '维修班组' },
          { value: 'quality', label: '质检班组' },
          { value: 'logistics', label: '物流班组' },
        ],
      },
    },
    {
      name: 'work_station_id',
      label: '所属工作站',
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'work_station_name',
      label: '工作站',
      type: 'text',
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'leader_id',
      label: '班组长ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'leader_name',
      label: '班组长',
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'member_count',
      label: '成员数',
      type: 'number',
      listWidth: 80,
      showInForm: false,
      sortable: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '停用' },
        ],
      },
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      colSpan: 2,
      showInList: false,
    },
  ],
  list: {
    searchFields: ['team_code', 'team_name'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: '活跃',
        inactive: '停用',
      },
    },
    pageSize: 10,
  },
  formSections: [
    {
      title: '基本信息',
      fields: ['team_code', 'team_name', 'team_type', 'status'],
    },
    {
      title: '关联信息',
      fields: ['work_station_id', 'leader_id'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],
  formColCount: 2,
  actions: ['create', 'edit', 'detail', 'delete'],
};
