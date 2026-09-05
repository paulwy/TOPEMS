import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const stockTakeSchema: EntitySchema = {
  entity: 'wms_stock_take',
  title: i18n.t('wms.stock_take.k0'),
  description: i18n.t('wms.stock_take.k1'),

  api: {
    module: 'wms',
    resource: 'stockTakes',
  },

  fields: [
    {
      name: 'stock_take_number',
      label: i18n.t('wms.stock_take.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.stock_take.k3'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'warehouse_name',
      label: i18n.t('wms.stock_take.k4'),
      type: 'text',
      listWidth: 140,
      hideInForm: true,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.stock_take.k5'),
      type: 'select',
      defaultValue: 'planned',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: i18n.t('wms.stock_take.k6') },
          { value: 'in_progress', label: i18n.t('wms.stock_take.k7') },
          { value: 'completed', label: i18n.t('wms.stock_take.k8') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'accuracy_rate',
      label: i18n.t('wms.stock_take.k9'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
      renderCell: (value: unknown) => (value ? `${(value as number).toFixed(1)}%` : '-'),
    },
    {
      name: 'discrepancy_quantity',
      label: i18n.t('wms.stock_take.k10'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'stock_adjusted',
      label: i18n.t('wms.stock_take.k11'),
      type: 'switch',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'remarks',
      label: i18n.t('wms.stock_take.k12'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.stock_take.k13'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'stock_take_number',
      'warehouse_name',
      'status',
      'accuracy_rate',
      'discrepancy_quantity',
      'created_at',
    ],
    searchFields: ['stock_take_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'warning',
        in_progress: 'default',
        completed: 'success',
      },
      labelMap: {
        planned: i18n.t('wms.stock_take.k14'),
        in_progress: i18n.t('wms.stock_take.k15'),
        completed: i18n.t('wms.stock_take.k16'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.stock_take.k17'),
        type: 'select',
        options: [
          { label: i18n.t('wms.stock_take.k18'), value: 'all' },
          { label: i18n.t('wms.stock_take.k19'), value: 'planned' },
          { label: i18n.t('wms.stock_take.k20'), value: 'in_progress' },
          { label: i18n.t('wms.stock_take.k21'), value: 'completed' },
        ],
      },
    ],
  },

  actions: ['create', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.stock_take.k22'),
      fields: ['stock_take_number', 'warehouse_id', 'remarks'],
    },
  ],

  formColCount: 1,
  createTitle: i18n.t('wms.stock_take.k23'),
  detailTitle: i18n.t('wms.stock_take.k24'),

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
