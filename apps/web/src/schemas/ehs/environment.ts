import type { EntitySchema } from '@/schema';

export const environmentMonitorSchema: EntitySchema = {
  entity: 'ehsEnvironmentMonitor',
  title: '环境监测点',
  description: '管理企业环境监测点信息，包括监测类型、位置、频率、阈值、状态等',

  api: {
    module: 'ehs',
    resource: 'environmentMonitors',
  },

  fields: [
    {
      name: 'monitor_no',
      label: '监测点编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'name',
      label: '监测点名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'monitor_type',
      label: '监测类型',
      type: 'select',
      required: true,
      defaultValue: '水质监测',
      options: {
        type: 'static',
        options: [
          { value: '水质监测', label: '水质监测' },
          { value: '空气质量', label: '空气质量' },
          { value: '噪声监测', label: '噪声监测' },
          { value: '土壤监测', label: '土壤监测' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'monitor_frequency',
      label: '监测频率',
      type: 'text',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.monitor_frequency as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'standard_value',
      label: '标准值',
      type: 'text',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.standard_value as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.unit as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'warning_threshold',
      label: '预警阈值',
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.warning_threshold as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'alarm_threshold',
      label: '报警阈值',
      type: 'number',
      listWidth: 100,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.alarm_threshold as number | null | undefined;
        return v != null ? String(v) : '-';
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
          { value: 'active', label: '正常运行' },
          { value: 'inactive', label: '停用' },
          { value: 'maintenance', label: '维护中' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: ['monitor_no', 'name', 'monitor_type', 'location', 'status'],
    searchFields: ['name', 'monitor_no'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        maintenance: 'warning',
      },
      labelMap: {
        active: '正常运行',
        inactive: '停用',
        maintenance: '维护中',
      },
    },
    filters: [
      {
        id: 'monitor_type',
        label: '监测类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '水质监测', value: '水质监测' },
          { label: '空气质量', value: '空气质量' },
          { label: '噪声监测', value: '噪声监测' },
          { label: '土壤监测', value: '土壤监测' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '正常运行', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '维护中', value: 'maintenance' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'monitor_type', 'location', 'status'],
    },
    {
      title: '监测参数',
      fields: ['monitor_frequency', 'standard_value', 'unit', 'warning_threshold', 'alarm_threshold'],
    },
    {
      title: '其他信息',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增环境监测点',
  editTitle: '编辑环境监测点',
  detailTitle: '环境监测点详情',
};
