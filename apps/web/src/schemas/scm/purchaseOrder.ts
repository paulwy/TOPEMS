import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

const itemFields = [
  {
    name: 'line_no',
    label: i18n.t('scm.purchase_order.k0'),
    type: 'number' as const,
    listWidth: 80,
  },
  {
    name: 'material_code',
    label: i18n.t('scm.purchase_order.k1'),
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'material_name',
    label: i18n.t('scm.purchase_order.k2'),
    type: 'text' as const,
    listWidth: 160,
  },
  {
    name: 'qty',
    label: i18n.t('scm.purchase_order.k3'),
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'unit',
    label: i18n.t('scm.purchase_order.k4'),
    type: 'text' as const,
    listWidth: 80,
  },
  {
    name: 'price',
    label: i18n.t('scm.purchase_order.k5'),
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'amount',
    label: i18n.t('scm.purchase_order.k6'),
    type: 'number' as const,
    listWidth: 120,
  },
];

export const purchaseOrderSchema: EntitySchema & SchemaExtensions = {
  entity: 'purchaseOrder',
  title: i18n.t('scm.purchase_order.k7'),
  description: i18n.t('scm.purchase_order.k8'),

  api: {
    module: 'scm',
    resource: 'purchaseOrders',
  },

  fields: [
    {
      name: 'orderNo',
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
      required: true,
      listWidth: 160,
    },
    {
      name: 'title',
      label: i18n.t('scm.purchase_order.k11'),
      type: 'text',
      required: true,
      listWidth: 180,
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
      name: 'expected_date',
      label: i18n.t('scm.purchase_order.k21'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: [
      'orderNo',
      'supplier_id',
      'title',
      'total_amount',
      'status',
      'order_date',
      'expected_date',
    ],
    searchFields: ['orderNo', 'title', 'supplier_id'],
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
      fields: ['orderNo', 'supplier_id', 'title', 'status'],
    },
    {
      title: i18n.t('scm.purchase_order.k37'),
      fields: ['total_amount', 'order_date', 'expected_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_order.k38'),
  editTitle: i18n.t('scm.purchase_order.k39'),
  detailTitle: i18n.t('scm.purchase_order.k40'),

  nestedTables: [
    {
      field: 'items',
      title: i18n.t('scm.purchase_order.k41'),
      columns: columnsFromFields(itemFields),
      fields: itemFields,
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowDuplicate: true,
      addButtonText: i18n.t('scm.purchase_order.k42'),
      rowKeyField: 'line_no',
      minRows: 1,
      formColCount: 2,
    },
  ],

  wizard: {
    steps: [
      {
        key: 'basic',
        title: i18n.t('scm.purchase_order.k43'),
        description: i18n.t('scm.purchase_order.k44'),
        fields: ['orderNo', 'supplier_id', 'title', 'order_date', 'expected_date', 'status'],
      },
      {
        key: 'items',
        title: i18n.t('scm.purchase_order.k45'),
        description: i18n.t('scm.purchase_order.k46'),
        fields: ['items'],
      },
      {
        key: 'confirm',
        title: i18n.t('scm.purchase_order.k47'),
        description: i18n.t('scm.purchase_order.k48'),
        fields: ['total_amount'],
        isFinalStep: true,
      },
    ],
    title: i18n.t('scm.purchase_order.k49'),
    showProgress: true,
    showSummaryOnComplete: true,
    finishButtonText: i18n.t('scm.purchase_order.k50'),
    nextButtonText: i18n.t('scm.purchase_order.k51'),
    prevButtonText: i18n.t('scm.purchase_order.k52'),
  },
};
