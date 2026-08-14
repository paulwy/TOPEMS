import type { EntitySchema } from '@/schema';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const batchSchema: EntitySchema = {
  entity: 'wms_batch',
  title: i18n.t('wms.batch.k0'),
  description: i18n.t('wms.batch.k1'),

  api: {
    module: 'wms',
    resource: 'batches',
  },

  fields: [
    {
      name: 'batch_no',
      label: i18n.t('wms.batch.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'sku',
      label: i18n.t('wms.batch.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'material_name',
      label: i18n.t('wms.batch.k4'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      readonlyOnEdit: true,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'specification',
      label: i18n.t('wms.batch.k5'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'unit',
      label: i18n.t('wms.batch.k6'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'quantity',
      label: i18n.t('wms.batch.k7'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: i18n.t('wms.batch.k8'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.batch.k9'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'location_id',
      label: i18n.t('wms.batch.k10'),
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'location',
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('wms.batch.k11'),
      type: 'select',
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'supplier',
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'production_date',
      label: i18n.t('wms.batch.k12'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'expiry_date',
      label: i18n.t('wms.batch.k13'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'receipt_date',
      label: i18n.t('wms.batch.k14'),
      type: 'date',
      listWidth: 120,
      readonlyOnEdit: true,
    },
    {
      name: 'quality_status',
      label: i18n.t('wms.batch.k15'),
      type: 'select',
      required: true,
      defaultValue: 'qualified',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.batch.k16') },
          { value: 'inspecting', label: i18n.t('wms.batch.k17') },
          { value: 'qualified', label: i18n.t('wms.batch.k18') },
          { value: 'unqualified', label: i18n.t('wms.batch.k19') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.batch.k20'),
      type: 'select',
      defaultValue: 'in_stock',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'in_stock', label: i18n.t('wms.batch.k21') },
          { value: 'out_stock', label: i18n.t('wms.batch.k22') },
          { value: 'reserved', label: i18n.t('wms.batch.k23') },
          { value: 'frozen', label: i18n.t('wms.batch.k24') },
          { value: 'scrapped', label: i18n.t('wms.batch.k25') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'shelf_life_days',
      label: i18n.t('wms.batch.k26'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'unit_price',
      label: i18n.t('wms.batch.k27'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_value',
      label: i18n.t('wms.batch.k28'),
      type: 'number',
      listWidth: 120,
      hideInForm: true,
    },
    {
      name: 'remaining_days',
      label: i18n.t('wms.batch.k29'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'remark',
      label: i18n.t('wms.batch.k30'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.batch.k31'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.batch.k32'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'batch_no',
      'sku',
      'material_name',
      'specification',
      'unit',
      'quantity',
      'available_quantity',
      'warehouse_id',
      'location_id',
      'supplier_id',
      'quality_status',
      'status',
      'expiry_date',
      'remaining_days',
    ],
    searchFields: ['batch_no', 'sku', 'material_name'],
    pageSize: 10,
    statusBadge: {
      field: 'quality_status',
      colorMap: {
        pending: 'warning',
        inspecting: 'primary',
        qualified: 'success',
        unqualified: 'error',
      },
      labelMap: {
        pending: i18n.t('wms.batch.k33'),
        inspecting: i18n.t('wms.batch.k34'),
        qualified: i18n.t('wms.batch.k35'),
        unqualified: i18n.t('wms.batch.k36'),
      },
    },
    filters: [
      {
        id: 'quality_status',
        label: i18n.t('wms.batch.k37'),
        type: 'select',
        options: [
          { label: i18n.t('wms.batch.k38'), value: 'all' },
          { label: i18n.t('wms.batch.k39'), value: 'pending' },
          { label: i18n.t('wms.batch.k40'), value: 'inspecting' },
          { label: i18n.t('wms.batch.k41'), value: 'qualified' },
          { label: i18n.t('wms.batch.k42'), value: 'unqualified' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('wms.batch.k43'),
        type: 'select',
        options: [
          { label: i18n.t('wms.batch.k44'), value: 'all' },
          { label: i18n.t('wms.batch.k45'), value: 'in_stock' },
          { label: i18n.t('wms.batch.k46'), value: 'out_stock' },
          { label: i18n.t('wms.batch.k47'), value: 'reserved' },
          { label: i18n.t('wms.batch.k48'), value: 'frozen' },
          { label: i18n.t('wms.batch.k49'), value: 'scrapped' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.batch.k50'),
        type: 'select',
        options: [{ label: i18n.t('wms.batch.k51'), value: 'all' }],
      },
      {
        id: 'expiry_warning',
        label: i18n.t('wms.batch.k52'),
        type: 'select',
        options: [
          { label: i18n.t('wms.batch.k53'), value: 'all' },
          { label: i18n.t('wms.batch.k54'), value: 'true' },
          { label: i18n.t('wms.batch.k55'), value: 'expired' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.batch.k56'),
      fields: ['batch_no', 'sku', 'material_name', 'specification', 'unit'],
    },
    {
      title: i18n.t('wms.batch.k57'),
      fields: ['warehouse_id', 'location_id', 'supplier_id', 'quantity', 'quality_status'],
    },
    {
      title: i18n.t('wms.batch.k58'),
      fields: ['production_date', 'expiry_date', 'receipt_date', 'shelf_life_days'],
    },
    {
      title: i18n.t('wms.batch.k59'),
      fields: ['unit_price'],
    },
    {
      title: i18n.t('wms.batch.k60'),
      fields: ['remark'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('wms.batch.k61'),
  editTitle: i18n.t('wms.batch.k62'),
  detailTitle: i18n.t('wms.batch.k63'),

  dynamicOptions: [
    {
      field: 'warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((w) => ({
            value: w.id,
            label: w.name,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.WAREHOUSE_OPTIONS_BASE,
    },
    {
      field: 'location_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.locations.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((l) => ({
            value: l.id,
            label: l.code || l.name || l.id,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.LOCATION_OPTIONS_BASE,
    },
    {
      field: 'supplier_id',
      loader: async () => {
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.SUPPLIER_OPTIONS_BASE,
    },
  ],
};
