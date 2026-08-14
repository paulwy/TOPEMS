import type { EntitySchema } from '@/schema';


import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const inventorySchema: EntitySchema = {
  entity: 'wms_inventory',
  title: i18n.t('wms.inventory.k0'),
  description: i18n.t('wms.inventory.k1'),

  api: {
    module: 'wms',
    resource: 'inventory',
  },

  fields: [
    {
      name: 'sku',
      label: i18n.t('wms.inventory.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'name',
      label: i18n.t('wms.inventory.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'specification',
      label: i18n.t('wms.inventory.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'unit',
      label: i18n.t('wms.inventory.k5'),
      type: 'text',
      required: true,
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'quantity',
      label: i18n.t('wms.inventory.k6'),
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: i18n.t('wms.inventory.k7'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.inventory.k8'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'status',
      label: i18n.t('wms.inventory.k9'),
      type: 'select',
      defaultValue: 'qualified',
      options: {
        type: 'static',
        options: [
          { value: 'qualified', label: i18n.t('wms.inventory.k10') },
          { value: 'unqualified', label: i18n.t('wms.inventory.k11') },
          { value: 'pending', label: i18n.t('wms.inventory.k12') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'batch_number',
      label: i18n.t('wms.inventory.k13'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'min_quantity',
      label: i18n.t('wms.inventory.k14'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'max_quantity',
      label: i18n.t('wms.inventory.k15'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'expiry_date',
      label: i18n.t('wms.inventory.k16'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.inventory.k17'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.inventory.k18'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'sku',
      'name',
      'specification',
      'unit',
      'quantity',
      'available_quantity',
      'warehouse_id',
      'status',
      'batch_number',
    ],
    searchFields: ['sku', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        qualified: 'success',
        unqualified: 'error',
        pending: 'warning',
      },
      labelMap: {
        qualified: i18n.t('wms.inventory.k19'),
        unqualified: i18n.t('wms.inventory.k20'),
        pending: i18n.t('wms.inventory.k21'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.inventory.k22'),
        type: 'select',
        options: [
          { label: i18n.t('wms.inventory.k23'), value: 'all' },
          { label: i18n.t('wms.inventory.k24'), value: 'qualified' },
          { label: i18n.t('wms.inventory.k25'), value: 'unqualified' },
          { label: i18n.t('wms.inventory.k26'), value: 'pending' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.inventory.k27'),
        type: 'select',
        options: [{ label: i18n.t('wms.inventory.k28'), value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.inventory.k29'),
      fields: ['sku', 'name', 'specification', 'unit'],
    },
    {
      title: i18n.t('wms.inventory.k30'),
      fields: ['warehouse_id', 'quantity', 'min_quantity', 'max_quantity', 'status'],
    },
    {
      title: i18n.t('wms.inventory.k31'),
      fields: ['batch_number', 'expiry_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.inventory.k32'),
  editTitle: i18n.t('wms.inventory.k33'),
  detailTitle: i18n.t('wms.inventory.k34'),

  dynamicOptions: [
    {
      field: 'warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
        if (response.success && response.data) {
          return (response.data.items || []).map((w: { id: string; name: string }) => ({
            value: w.id,
            label: w.name,
          }));
        }
        return [];
      },
      queryKey: QUERY_KEYS.AD_HOC.WAREHOUSE_OPTIONS_BASE,
    },
  ],
};
