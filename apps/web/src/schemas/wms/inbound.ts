import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const inboundOrderSchema: EntitySchema = {
  entity: 'wms_inbound_order',
  title: i18n.t('wms.inbound.k0'),
  description: i18n.t('wms.inbound.k1'),

  api: {
    module: 'wms',
    resource: 'inbound-orders',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.inbound.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'order_type',
      label: i18n.t('wms.inbound.k3'),
      type: 'select',
      required: true,
      defaultValue: 'purchase',
      options: {
        type: 'static',
        options: [
          { value: 'purchase', label: i18n.t('wms.inbound.k4') },
          { value: 'return', label: i18n.t('wms.inbound.k5') },
          { value: 'transfer', label: i18n.t('wms.inbound.k6') },
          { value: 'production', label: i18n.t('wms.inbound.k7') },
          { value: 'other', label: i18n.t('wms.inbound.k8') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.inbound.k9'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'supplier_name',
      label: i18n.t('wms.inbound.k10'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'expected_date',
      label: i18n.t('wms.inbound.k11'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('wms.inbound.k12'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.inbound.k13') },
          { value: 'confirmed', label: i18n.t('wms.inbound.k14') },
          { value: 'receiving', label: i18n.t('wms.inbound.k15') },
          { value: 'quality_check', label: i18n.t('wms.inbound.k16') },
          { value: 'completed', label: i18n.t('wms.inbound.k17') },
          { value: 'cancelled', label: i18n.t('wms.inbound.k18') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'total_quantity',
      label: i18n.t('wms.inbound.k19'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: i18n.t('wms.inbound.k20'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.inbound.k21'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.inbound.k22'),
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
      'supplier_name',
      'expected_date',
      'status',
      'total_quantity',
      'total_amount',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'info',
        receiving: 'info',
        quality_check: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        pending: i18n.t('wms.inbound.k23'),
        confirmed: i18n.t('wms.inbound.k24'),
        receiving: i18n.t('wms.inbound.k25'),
        quality_check: i18n.t('wms.inbound.k26'),
        completed: i18n.t('wms.inbound.k27'),
        cancelled: i18n.t('wms.inbound.k28'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.inbound.k29'),
        type: 'select',
        options: [
          { label: i18n.t('wms.inbound.k30'), value: 'all' },
          { label: i18n.t('wms.inbound.k31'), value: 'pending' },
          { label: i18n.t('wms.inbound.k32'), value: 'confirmed' },
          { label: i18n.t('wms.inbound.k33'), value: 'receiving' },
          { label: i18n.t('wms.inbound.k34'), value: 'quality_check' },
          { label: i18n.t('wms.inbound.k35'), value: 'completed' },
          { label: i18n.t('wms.inbound.k36'), value: 'cancelled' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.inbound.k37'),
        type: 'select',
        options: [{ label: i18n.t('wms.inbound.k38'), value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.inbound.k39'),
      fields: ['order_number', 'order_type', 'warehouse_id', 'supplier_name'],
    },
    {
      title: i18n.t('wms.inbound.k40'),
      fields: ['expected_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.inbound.k41'),
  editTitle: i18n.t('wms.inbound.k42'),
  detailTitle: i18n.t('wms.inbound.k43'),

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
