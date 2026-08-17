import type { EntitySchema } from '@/schema';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export const suggestionSchema: EntitySchema = {
  entity: 'wms_replenishment_suggestion',
  title: i18n.t('wms.suggestion.k0'),
  description: i18n.t('wms.suggestion.k1'),

  api: {
    module: 'wms',
    resource: 'smartReplenishment',
  },

  fields: [
    {
      name: 'suggestion_number',
      label: i18n.t('wms.suggestion.k2'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'sku',
      label: i18n.t('wms.suggestion.k3'),
      type: 'text',
      listWidth: 130,
    },
    {
      name: 'material_name',
      label: i18n.t('wms.suggestion.k4'),
      type: 'text',
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'warehouse_id',
      label: i18n.t('wms.suggestion.k5'),
      type: 'select',
      listWidth: 120,
      options: {
        type: 'dynamic',
        resolver: 'warehouse',
      },
      renderCell: (row: Record<string, unknown>) => {
        return (row.warehouse_name as string) || (row.warehouse_id as string) || '-';
      },
    },
    {
      name: 'current_quantity',
      label: i18n.t('wms.suggestion.k6'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'available_quantity',
      label: i18n.t('wms.suggestion.k7'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'safety_stock',
      label: i18n.t('wms.suggestion.k8'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
    },
    {
      name: 'suggested_quantity',
      label: i18n.t('wms.suggestion.k9'),
      type: 'number',
      listWidth: 110,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const qty = row.suggested_quantity as number;
        const unit = (row.unit as string) || '';
        return `${qty} ${unit}`;
      },
    },
    {
      name: 'priority',
      label: i18n.t('wms.suggestion.k10'),
      type: 'select',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'urgent', label: i18n.t('wms.suggestion.k11') },
          { value: 'high', label: i18n.t('wms.suggestion.k12') },
          { value: 'normal', label: i18n.t('wms.suggestion.k13') },
          { value: 'low', label: i18n.t('wms.suggestion.k14') },
        ],
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.suggestion.k15'),
      type: 'select',
      listWidth: 100,
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('wms.suggestion.k16') },
          { value: 'approved', label: i18n.t('wms.suggestion.k17') },
          { value: 'rejected', label: i18n.t('wms.suggestion.k18') },
          { value: 'converted', label: i18n.t('wms.suggestion.k19') },
        ],
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_name',
      label: i18n.t('wms.suggestion.k20'),
      type: 'text',
      listWidth: 140,
      hideInForm: true,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'unit_price',
      label: i18n.t('wms.suggestion.k21'),
      type: 'number',
      listWidth: 100,
      hideInForm: true,
      renderCell: (value: unknown) => {
        const price = value as number;
        return price ? `¥${price}` : '-';
      },
    },
    {
      name: 'total_cost',
      label: i18n.t('wms.suggestion.k22'),
      type: 'number',
      listWidth: 120,
      hideInForm: true,
      renderCell: (value: unknown) => {
        const cost = value as number;
        return cost ? `¥${cost}` : '-';
      },
    },
    {
      name: 'generated_at',
      label: i18n.t('wms.suggestion.k23'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 150,
    },
  ],

  list: {
    columns: [
      'suggestion_number',
      'sku',
      'material_name',
      'warehouse_id',
      'current_quantity',
      'suggested_quantity',
      'priority',
      'status',
    ],
    searchFields: ['suggestion_number', 'sku', 'material_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'info',
        rejected: 'error',
        converted: 'success',
      },
      labelMap: {
        pending: i18n.t('wms.suggestion.k24'),
        approved: i18n.t('wms.suggestion.k25'),
        rejected: i18n.t('wms.suggestion.k26'),
        converted: i18n.t('wms.suggestion.k27'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.suggestion.k28'),
        type: 'select',
        options: [
          { label: i18n.t('wms.suggestion.k29'), value: 'all' },
          { label: i18n.t('wms.suggestion.k30'), value: 'pending' },
          { label: i18n.t('wms.suggestion.k31'), value: 'approved' },
          { label: i18n.t('wms.suggestion.k32'), value: 'rejected' },
          { label: i18n.t('wms.suggestion.k33'), value: 'converted' },
        ],
      },
      {
        id: 'warehouse_id',
        label: i18n.t('wms.suggestion.k34'),
        type: 'select',
        options: [{ label: i18n.t('wms.suggestion.k35'), value: 'all' }],
      },
      {
        id: 'priority',
        label: i18n.t('wms.suggestion.k36'),
        type: 'select',
        options: [
          { label: i18n.t('wms.suggestion.k37'), value: 'all' },
          { label: i18n.t('wms.suggestion.k38'), value: 'urgent' },
          { label: i18n.t('wms.suggestion.k39'), value: 'high' },
          { label: i18n.t('wms.suggestion.k40'), value: 'normal' },
          { label: i18n.t('wms.suggestion.k41'), value: 'low' },
        ],
      },
    ],
  },

  actions: ['detail'],

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
