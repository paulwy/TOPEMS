import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const transferSchema: EntitySchema = {
  entity: 'wms_transfer',
  title: i18n.t('wms.transfer.k0'),
  description: i18n.t('wms.transfer.k1'),

  api: {
    module: 'wms',
    resource: 'transfers',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.transfer.k2'),
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'transfer_type',
      label: i18n.t('wms.transfer.k3'),
      type: 'select',
      required: true,
      defaultValue: 'internal',
      listWidth: 110,
      options: {
        type: 'static',
        options: [
          { value: 'internal', label: i18n.t('wms.transfer.k4') },
          { value: 'external', label: i18n.t('wms.transfer.k5') },
          { value: 'return', label: i18n.t('wms.transfer.k6') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'from_warehouse_id',
      label: i18n.t('wms.transfer.k7'),
      type: 'select',
      required: true,
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'from_location_id',
      label: i18n.t('wms.transfer.k8'),
      type: 'select',
      listWidth: 120,
      hideInForm: false,
    },
    {
      name: 'to_warehouse_id',
      label: i18n.t('wms.transfer.k9'),
      type: 'select',
      required: true,
      listWidth: 140,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'to_location_id',
      label: i18n.t('wms.transfer.k10'),
      type: 'select',
      listWidth: 120,
      hideInForm: false,
    },
    {
      name: 'total_quantity',
      label: i18n.t('wms.transfer.k11'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'priority',
      label: i18n.t('wms.transfer.k12'),
      type: 'select',
      required: true,
      defaultValue: 'normal',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'urgent', label: i18n.t('wms.transfer.k13') },
          { value: 'high', label: i18n.t('wms.transfer.k14') },
          { value: 'normal', label: i18n.t('wms.transfer.k15') },
          { value: 'low', label: i18n.t('wms.transfer.k16') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.transfer.k17'),
      type: 'select',
      defaultValue: 'pending',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.transfer.k18') },
          { value: 'confirmed', label: i18n.t('wms.transfer.k19') },
          { value: 'shipped', label: i18n.t('wms.transfer.k20') },
          { value: 'received', label: i18n.t('wms.transfer.k21') },
          { value: 'completed', label: i18n.t('wms.transfer.k22') },
          { value: 'cancelled', label: i18n.t('wms.transfer.k23') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'planned_date',
      label: i18n.t('wms.transfer.k24'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'transporter',
      label: i18n.t('wms.transfer.k25'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'tracking_number',
      label: i18n.t('wms.transfer.k26'),
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'remarks',
      label: i18n.t('wms.transfer.k27'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.transfer.k28'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.transfer.k29'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'order_number',
      'transfer_type',
      'from_warehouse_id',
      'to_warehouse_id',
      'total_quantity',
      'priority',
      'status',
      'planned_date',
    ],
    searchFields: ['order_number', 'transporter', 'tracking_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        shipped: 'info',
        received: 'success',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('wms.transfer.k30'),
        confirmed: i18n.t('wms.transfer.k31'),
        shipped: i18n.t('wms.transfer.k32'),
        received: i18n.t('wms.transfer.k33'),
        completed: i18n.t('wms.transfer.k34'),
        cancelled: i18n.t('wms.transfer.k35'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.transfer.k36'),
        type: 'select',
        options: [
          { label: i18n.t('wms.transfer.k37'), value: 'all' },
          { label: i18n.t('wms.transfer.k38'), value: 'pending' },
          { label: i18n.t('wms.transfer.k39'), value: 'confirmed' },
          { label: i18n.t('wms.transfer.k40'), value: 'shipped' },
          { label: i18n.t('wms.transfer.k41'), value: 'received' },
          { label: i18n.t('wms.transfer.k42'), value: 'completed' },
          { label: i18n.t('wms.transfer.k43'), value: 'cancelled' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.transfer.k44'),
        type: 'select',
        options: [{ label: i18n.t('wms.transfer.k45'), value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.transfer.k46'),
      fields: ['order_number', 'transfer_type', 'priority'],
    },
    {
      title: i18n.t('wms.transfer.k47'),
      fields: ['from_warehouse_id', 'from_location_id', 'to_warehouse_id', 'to_location_id'],
    },
    {
      title: i18n.t('wms.transfer.k48'),
      fields: ['planned_date', 'transporter', 'tracking_number'],
    },
    {
      title: i18n.t('wms.transfer.k49'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.transfer.k50'),
  editTitle: i18n.t('wms.transfer.k51'),
  detailTitle: i18n.t('wms.transfer.k52'),

  dynamicOptions: [
    {
      field: 'from_warehouse_id',
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
      field: 'to_warehouse_id',
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
  ],
};
