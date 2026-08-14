import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const fixedAssetSchema: EntitySchema = {
  entity: 'finance_fixed_asset',
  title: i18n.t('finance.fixed_asset.k0'),
  description: i18n.t('finance.fixed_asset.k1'),

  api: {
    module: 'erp',
    resource: 'fixedAssets',
  },

  fields: [
    {
      name: 'asset_code',
      label: i18n.t('finance.fixed_asset.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'asset_name',
      label: i18n.t('finance.fixed_asset.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'asset_category',
      label: i18n.t('finance.fixed_asset.k4'),
      type: 'select',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'office_equipment', label: i18n.t('finance.fixed_asset.k5') },
          { value: 'computer', label: i18n.t('finance.fixed_asset.k6') },
          { value: 'server', label: i18n.t('finance.fixed_asset.k7') },
          { value: 'network', label: i18n.t('finance.fixed_asset.k8') },
          { value: 'furniture', label: i18n.t('finance.fixed_asset.k9') },
          { value: 'vehicle', label: i18n.t('finance.fixed_asset.k10') },
        ],
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'purchase_date',
      label: i18n.t('finance.fixed_asset.k11'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'original_value',
      label: i18n.t('finance.fixed_asset.k12'),
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
      label: i18n.t('finance.fixed_asset.k13'),
      type: 'number',
      listWidth: 100,
      align: 'right',
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'accumulated_depreciation',
      label: i18n.t('finance.fixed_asset.k14'),
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
      label: i18n.t('finance.fixed_asset.k15'),
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
      label: i18n.t('finance.fixed_asset.k16'),
      type: 'select',
      defaultValue: 'straight_line',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'straight_line', label: i18n.t('finance.fixed_asset.k17') },
          { value: 'declining_balance', label: i18n.t('finance.fixed_asset.k18') },
          { value: 'sum_of_years', label: i18n.t('finance.fixed_asset.k19') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'expected_life',
      label: i18n.t('finance.fixed_asset.k20'),
      type: 'number',
      listWidth: 80,
      align: 'center',
      renderCell: (value: number) => `${value}${i18n.t('shared.fixed_asset.k0')}`,
    },
    {
      name: 'monthly_depreciation',
      label: i18n.t('finance.fixed_asset.k21'),
      type: 'number',
      listWidth: 120,
      align: 'right',
      hideInForm: true,
      renderCell: (value: number) =>
        `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    {
      name: 'location',
      label: i18n.t('finance.fixed_asset.k22'),
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'department_id',
      label: i18n.t('finance.fixed_asset.k23'),
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'department',
      },
    },
    {
      name: 'status',
      label: i18n.t('finance.fixed_asset.k24'),
      type: 'select',
      defaultValue: 'active',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.fixed_asset.k25') },
          { value: 'idle', label: i18n.t('finance.fixed_asset.k26') },
          { value: 'depreciated', label: i18n.t('finance.fixed_asset.k27') },
          { value: 'retired', label: i18n.t('finance.fixed_asset.k28') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
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
        active: i18n.t('finance.fixed_asset.k29'),
        idle: i18n.t('finance.fixed_asset.k30'),
        depreciated: i18n.t('finance.fixed_asset.k31'),
        retired: i18n.t('finance.fixed_asset.k32'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('finance.fixed_asset.k33'),
        type: 'select',
        options: [
          { label: i18n.t('finance.fixed_asset.k34'), value: 'all' },
          { label: i18n.t('finance.fixed_asset.k35'), value: 'active' },
          { label: i18n.t('finance.fixed_asset.k36'), value: 'idle' },
          { label: i18n.t('finance.fixed_asset.k37'), value: 'depreciated' },
          { label: i18n.t('finance.fixed_asset.k38'), value: 'retired' },
        ],
      },
      {
        id: 'asset_category',
        label: i18n.t('finance.fixed_asset.k39'),
        type: 'select',
        options: [
          { label: i18n.t('finance.fixed_asset.k40'), value: 'all' },
          { label: i18n.t('finance.fixed_asset.k41'), value: 'office_equipment' },
          { label: i18n.t('finance.fixed_asset.k42'), value: 'computer' },
          { label: i18n.t('finance.fixed_asset.k43'), value: 'server' },
          { label: i18n.t('finance.fixed_asset.k44'), value: 'network' },
          { label: i18n.t('finance.fixed_asset.k45'), value: 'furniture' },
          { label: i18n.t('finance.fixed_asset.k46'), value: 'vehicle' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.fixed_asset.k47'),
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
      title: i18n.t('finance.fixed_asset.k48'),
      fields: ['original_value', 'salvage_value', 'depreciation_method', 'expected_life'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.fixed_asset.k49'),
  editTitle: i18n.t('finance.fixed_asset.k50'),
  detailTitle: i18n.t('finance.fixed_asset.k51'),

  batchActions: [
    {
      key: 'depreciate',
      label: i18n.t('finance.fixed_asset.k52'),
      icon: 'Calculator',
      color: 'primary',
      description: i18n.t('finance.fixed_asset.k53'),
      onClick: () => {},
    },
  ],
};
