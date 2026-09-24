import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const outboundOrderSchema: EntitySchema = {
  entity: 'wms_outbound_order',
  title: i18n.t('wms.outbound.k0'),
  description: i18n.t('wms.outbound.k1'),

  api: {
    module: 'wms',
    resource: 'outbound-orders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.outbound.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'order_type',
      label: i18n.t('wms.outbound.k3'),
      type: 'select',
      required: true,
      defaultValue: 'sale',
      options: {
        type: 'static',
        options: [
          { value: 'sale', label: i18n.t('wms.outbound.k4') },
          { value: 'return', label: i18n.t('wms.outbound.k5') },
          { value: 'transfer', label: i18n.t('wms.outbound.k6') },
          { value: 'production', label: i18n.t('wms.outbound.k7') },
          { value: 'other', label: i18n.t('wms.outbound.k8') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.outbound.k9'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'customer_name',
      label: i18n.t('wms.outbound.k10'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'shipping_address',
      label: i18n.t('wms.outbound.k11'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'expected_date',
      label: i18n.t('wms.outbound.k12'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('wms.outbound.k13'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.outbound.k14') },
          { value: 'confirmed', label: i18n.t('wms.outbound.k15') },
          { value: 'picking', label: i18n.t('wms.outbound.k16') },
          { value: 'picked', label: i18n.t('wms.outbound.k17') },
          { value: 'packing', label: i18n.t('wms.outbound.k18') },
          { value: 'shipped', label: i18n.t('wms.outbound.k19') },
          { value: 'completed', label: i18n.t('wms.outbound.k20') },
          { value: 'cancelled', label: i18n.t('wms.outbound.k21') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'total_quantity',
      label: i18n.t('wms.outbound.k22'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: i18n.t('wms.outbound.k23'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'remarks',
      label: i18n.t('wms.outbound.k24'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.outbound.k25'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.outbound.k26'),
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
      'order_type',
      'warehouse_id',
      'customer_name',
      'expected_date',
      'status',
      'total_quantity',
      'total_amount',
    ],
    searchFields: ['order_number', 'customer_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        picking: 'info',
        picked: 'info',
        packing: 'warning',
        shipped: 'success',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('wms.outbound.k27'),
        confirmed: i18n.t('wms.outbound.k28'),
        picking: i18n.t('wms.outbound.k29'),
        picked: i18n.t('wms.outbound.k30'),
        packing: i18n.t('wms.outbound.k31'),
        shipped: i18n.t('wms.outbound.k32'),
        completed: i18n.t('wms.outbound.k33'),
        cancelled: i18n.t('wms.outbound.k34'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.outbound.k35'),
        type: 'select',
        options: [
          { label: i18n.t('wms.outbound.k36'), value: 'all' },
          { label: i18n.t('wms.outbound.k37'), value: 'pending' },
          { label: i18n.t('wms.outbound.k38'), value: 'confirmed' },
          { label: i18n.t('wms.outbound.k39'), value: 'picking' },
          { label: i18n.t('wms.outbound.k40'), value: 'picked' },
          { label: i18n.t('wms.outbound.k41'), value: 'packing' },
          { label: i18n.t('wms.outbound.k42'), value: 'shipped' },
          { label: i18n.t('wms.outbound.k43'), value: 'completed' },
          { label: i18n.t('wms.outbound.k44'), value: 'cancelled' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.outbound.k45'),
        type: 'select',
        options: [{ label: i18n.t('wms.outbound.k46'), value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.outbound.k47'),
      fields: ['order_number', 'order_type', 'warehouse_id', 'customer_name'],
    },
    {
      title: i18n.t('wms.outbound.k48'),
      fields: ['shipping_address', 'expected_date'],
    },
    {
      title: i18n.t('wms.outbound.k49'),
      fields: ['remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.outbound.k50'),
  editTitle: i18n.t('wms.outbound.k51'),
  detailTitle: i18n.t('wms.outbound.k52'),

  dynamicOptions: [
    {
      field: 'warehouse_id',
      loader: async () => {
        const { wmsApi } = await import('@/api/wms');
        const response = await wmsApi.warehouses.list({ page: 1, page_size: 100 });
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
