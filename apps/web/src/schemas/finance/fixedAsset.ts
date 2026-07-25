import type { EntitySchema } from '@/schema';

export const fixedAssetSchema: EntitySchema = {
  entity: 'finance_fixed_asset',
  title: '固定资产',
  description: '管理企业固定资产，包括购置、折旧、处置等全生命周期',

  api: {
    module: 'erp',
    resource: 'fixedAssets',
  },

  fields: [
    {
      name: 'asset_code',
      label: '资产编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'asset_name',
      label: '资产名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
    },
    {
      name: 'asset_category',
      label: '资产分类',
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'office_equipment', label: '办公设备' },
          { value: 'computer', label: '电脑设备' },
          { value: 'server', label: '服务器' },
          { value: 'network', label: '网络设备' },
          { value: 'furniture', label: '办公家具' },
          { value: 'vehicle', label: '运输工具' },
        ],
      },
    },
    {
      name: 'purchase_date',
      label: '购入日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'original_value',
      label: '原值',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 120,
      align: 'right',
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'salvage_value',
      label: '残值',
      type: 'number',
      listWidth: 100,
      align: 'right',
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'accumulated_depreciation',
      label: '累计折旧',
      type: 'number',
      sortable: true,
      listWidth: 120,
      align: 'right',
      hideInForm: true,
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'net_value',
      label: '净值',
      type: 'number',
      sortable: true,
      listWidth: 120,
      align: 'right',
      hideInForm: true,
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'depreciation_method',
      label: '折旧方法',
      type: 'select',
      defaultValue: 'straight_line',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'straight_line', label: '直线法' },
          { value: 'declining_balance', label: '双倍余额递减法' },
          { value: 'sum_of_years', label: '年数总和法' },
        ],
      },
    },
    {
      name: 'expected_life',
      label: '使用年限',
      type: 'number',
      listWidth: 80,
      align: 'center',
      renderCell: (value: number) => `${value}年`,
    },
    {
      name: 'monthly_depreciation',
      label: '月折旧额',
      type: 'number',
      listWidth: 120,
      align: 'right',
      hideInForm: true,
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 150,
    },
    {
      name: 'department_id',
      label: '使用部门',
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'department',
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '使用中' },
          { value: 'idle', label: '闲置' },
          { value: 'depreciated', label: '已提足折旧' },
          { value: 'retired', label: '已报废' },
        ],
      },
    },
  ],

  list: {
    columns: [
      'asset_code',
      'asset_name',
      'asset_category',
      'original_value',
      'accumulated_depreciation',
      'net_value',
      'depreciation_method',
      'monthly_depreciation',
      'expected_life',
      'status',
    ],
    searchFields: ['asset_code', 'asset_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        idle: 'info',
        depreciated: 'default',
        retired: 'error',
      },
      labelMap: {
        active: '使用中',
        idle: '闲置',
        depreciated: '已提足折旧',
        retired: '已报废',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '使用中', value: 'active' },
          { label: '闲置', value: 'idle' },
          { label: '已提足折旧', value: 'depreciated' },
          { label: '已报废', value: 'retired' },
        ],
      },
      {
        id: 'asset_category',
        label: '资产分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '办公设备', value: 'office_equipment' },
          { label: '电脑设备', value: 'computer' },
          { label: '服务器', value: 'server' },
          { label: '网络设备', value: 'network' },
          { label: '办公家具', value: 'furniture' },
          { label: '运输工具', value: 'vehicle' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: [
        'asset_code',
        'asset_name',
        'asset_category',
        'purchase_date',
        'location',
        'department_id',
      ],
    },
    {
      title: '价值信息',
      fields: ['original_value', 'salvage_value', 'depreciation_method', 'expected_life'],
    },
  ],

  formColCount: 2,
  createTitle: '新增固定资产',
  editTitle: '编辑固定资产',
  detailTitle: '固定资产详情',

  batchActions: [
    {
      key: 'depreciate',
      label: '计提折旧',
      icon: 'Calculator',
      color: 'primary',
      description: '对选中的资产进行折旧计算',
      onClick: () => {},
    },
  ],
};
