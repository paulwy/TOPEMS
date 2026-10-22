import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const purchaseOrderSchema: EntitySchema = {
  entity: 'purchaseOrder',
  title: i18n.t('scm.purchase_order.k7'),
  description: i18n.t('scm.purchase_order.k8'),

  api: {
    module: 'scm',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      // 后端真键为 order_number（GET /api/scm/purchase-orders 返回）
      name: 'order_number',
      label: i18n.t('scm.purchase_order.k9'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('scm.purchase_order.k10'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'total_amount',
      label: i18n.t('scm.purchase_order.k12'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.purchase_order.k13'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.purchase_order.k14') },
          { value: 'pending', label: i18n.t('scm.purchase_order.k15') },
          { value: 'approved', label: i18n.t('scm.purchase_order.k16') },
          { value: 'confirmed', label: i18n.t('scm.purchase_order.k17') },
          { value: 'completed', label: i18n.t('scm.purchase_order.k18') },
          { value: 'cancelled', label: i18n.t('scm.purchase_order.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'order_date',
      label: i18n.t('scm.purchase_order.k20'),
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      // 后端真键 delivery_date（交付/到货日期）
      name: 'delivery_date',
      label: i18n.t('scm.purchase_order.k21'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'remarks',
      label: i18n.t('scm.purchase_order.k53'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
  ],

  list: {
    columns: ['order_number', 'supplier_id', 'total_amount', 'status', 'order_date'],
    searchFields: ['order_number', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'primary',
        confirmed: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('scm.purchase_order.k22'),
        pending: i18n.t('scm.purchase_order.k23'),
        approved: i18n.t('scm.purchase_order.k24'),
        confirmed: i18n.t('scm.purchase_order.k25'),
        completed: i18n.t('scm.purchase_order.k26'),
        cancelled: i18n.t('scm.purchase_order.k27'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.purchase_order.k28'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_order.k29'), value: 'all' },
          { label: i18n.t('scm.purchase_order.k30'), value: 'draft' },
          { label: i18n.t('scm.purchase_order.k31'), value: 'pending' },
          { label: i18n.t('scm.purchase_order.k32'), value: 'approved' },
          { label: i18n.t('scm.purchase_order.k33'), value: 'confirmed' },
          { label: i18n.t('scm.purchase_order.k34'), value: 'completed' },
          { label: i18n.t('scm.purchase_order.k35'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.purchase_order.k36'),
      fields: ['order_number', 'supplier_id', 'status'],
    },
    {
      title: i18n.t('scm.purchase_order.k37'),
      fields: ['total_amount', 'order_date', 'delivery_date', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_order.k38'),
  editTitle: i18n.t('scm.purchase_order.k39'),
  detailTitle: i18n.t('scm.purchase_order.k40'),
};
