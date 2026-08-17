import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const replenishmentSchema: EntitySchema = {
  entity: 'wms_replenishment_order',
  title: i18n.t('wms.replenishment.k0'),
  description: i18n.t('wms.replenishment.k1'),

  api: {
    module: 'wms',
    resource: 'smartReplenishment',
  },

  fields: [
    {
      name: 'order_number',
      label: i18n.t('wms.replenishment.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.replenishment.k3'),
      type: 'select',
      required: true,
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
    },
    {
      name: 'supplier_id',
      label: i18n.t('wms.replenishment.id_4'),
      type: 'text',
      listWidth: 140,
      showInList: true,
    },
    {
      name: 'supplier_name',
      label: i18n.t('wms.replenishment.k5'),
      type: 'text',
      listWidth: 140,
      hideInForm: true,
    },
    {
      name: 'total_quantity',
      label: i18n.t('wms.replenishment.k6'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'total_amount',
      label: i18n.t('wms.replenishment.k7'),
      type: 'number',
      sortable: true,
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'priority',
      label: i18n.t('wms.replenishment.k8'),
      type: 'select',
      defaultValue: 'normal',
      listWidth: 100,
      options: {
        type: 'static',
        options: [
          { value: 'urgent', label: i18n.t('wms.replenishment.k9') },
          { value: 'high', label: i18n.t('wms.replenishment.k10') },
          { value: 'normal', label: i18n.t('wms.replenishment.k11') },
          { value: 'low', label: i18n.t('wms.replenishment.k12') },
        ],
      },
    },
    {
      name: 'status',
      label: i18n.t('wms.replenishment.k13'),
      type: 'select',
      defaultValue: 'draft',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('wms.replenishment.k14') },
          { value: 'pending', label: i18n.t('wms.replenishment.k15') },
          { value: 'confirmed', label: i18n.t('wms.replenishment.k16') },
          { value: 'in_progress', label: i18n.t('wms.replenishment.k17') },
          { value: 'completed', label: i18n.t('wms.replenishment.k18') },
          { value: 'cancelled', label: i18n.t('wms.replenishment.k19') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'expected_date',
      label: i18n.t('wms.replenishment.k20'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'remarks',
      label: i18n.t('wms.replenishment.k21'),
      type: 'textarea',
      listWidth: 200,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.replenishment.k22'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.replenishment.k23'),
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
      'warehouse_id',
      'supplier_name',
      'total_quantity',
      'total_amount',
      'priority',
      'status',
      'expected_date',
    ],
    searchFields: ['order_number', 'supplier_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        confirmed: 'info',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('wms.replenishment.k24'),
        pending: i18n.t('wms.replenishment.k25'),
        confirmed: i18n.t('wms.replenishment.k26'),
        in_progress: i18n.t('wms.replenishment.k27'),
        completed: i18n.t('wms.replenishment.k28'),
        cancelled: i18n.t('wms.replenishment.k29'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.replenishment.k30'),
        type: 'select',
        options: [
          { label: i18n.t('wms.replenishment.k31'), value: 'all' },
          { label: i18n.t('wms.replenishment.k32'), value: 'draft' },
          { label: i18n.t('wms.replenishment.k33'), value: 'pending' },
          { label: i18n.t('wms.replenishment.k34'), value: 'confirmed' },
          { label: i18n.t('wms.replenishment.k35'), value: 'in_progress' },
          { label: i18n.t('wms.replenishment.k36'), value: 'completed' },
          { label: i18n.t('wms.replenishment.k37'), value: 'cancelled' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.replenishment.k38'),
        type: 'select',
        options: [{ label: i18n.t('wms.replenishment.k39'), value: 'all' }],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.replenishment.k40'),
      fields: ['order_number', 'warehouse_id', 'supplier_id', 'supplier_name'],
    },
    {
      title: i18n.t('wms.replenishment.k41'),
      fields: ['total_quantity', 'total_amount', 'priority', 'expected_date'],
    },
    {
      title: i18n.t('wms.replenishment.k42'),
      fields: ['remarks'],
    },
  ],

  formColCount: 3,
  createTitle: i18n.t('wms.replenishment.k43'),
  editTitle: i18n.t('wms.replenishment.k44'),
  detailTitle: i18n.t('wms.replenishment.k45'),

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
