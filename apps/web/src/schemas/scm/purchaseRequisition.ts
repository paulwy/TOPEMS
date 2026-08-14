import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';
import { columnsFromFields } from '@/schema/schemaExtensions';
import i18n from '@/i18n';

const itemFields = [
  {
    name: 'line_no',
    label: i18n.t('scm.purchase_requisition.k0'),
    type: 'number' as const,
    listWidth: 80,
  },
  {
    name: 'material_code',
    label: i18n.t('scm.purchase_requisition.k1'),
    type: 'text' as const,
    listWidth: 140,
  },
  {
    name: 'material_name',
    label: i18n.t('scm.purchase_requisition.k2'),
    type: 'text' as const,
    listWidth: 160,
  },
  {
    name: 'qty',
    label: i18n.t('scm.purchase_requisition.k3'),
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'unit',
    label: i18n.t('scm.purchase_requisition.k4'),
    type: 'text' as const,
    listWidth: 80,
  },
  {
    name: 'price',
    label: i18n.t('scm.purchase_requisition.k5'),
    type: 'number' as const,
    listWidth: 100,
  },
  {
    name: 'amount',
    label: i18n.t('scm.purchase_requisition.k6'),
    type: 'number' as const,
    listWidth: 120,
  },
];

export const purchaseRequisitionSchema: EntitySchema & SchemaExtensions = {
  entity: 'purchaseRequisition',
  title: i18n.t('scm.purchase_requisition.k7'),
  description: i18n.t('scm.purchase_requisition.k8'),

  api: {
    module: 'scm',
    resource: 'purchaseRequisitions',
  },

  fields: [
    {
      name: 'req_no',
      label: i18n.t('scm.purchase_requisition.k9'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('scm.purchase_requisition.k10'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'requester',
      label: i18n.t('scm.purchase_requisition.k11'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'department',
      label: i18n.t('scm.purchase_requisition.k12'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'reason',
      label: i18n.t('scm.purchase_requisition.k13'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'priority',
      label: i18n.t('scm.purchase_requisition.k14'),
      type: 'select',
      defaultValue: 'medium',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('scm.purchase_requisition.k15') },
          { value: 'medium', label: i18n.t('scm.purchase_requisition.k16') },
          { value: 'high', label: i18n.t('scm.purchase_requisition.k17') },
          { value: 'urgent', label: i18n.t('scm.purchase_requisition.k18') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('scm.purchase_requisition.k19'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.purchase_requisition.k20') },
          { value: 'pending', label: i18n.t('scm.purchase_requisition.k21') },
          { value: 'approved', label: i18n.t('scm.purchase_requisition.k22') },
          { value: 'rejected', label: i18n.t('scm.purchase_requisition.k23') },
          { value: 'cancelled', label: i18n.t('scm.purchase_requisition.k24') },
          { value: 'converted', label: i18n.t('scm.purchase_requisition.k25') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: ['req_no', 'title', 'requester', 'department', 'priority', 'status'],
    searchFields: ['req_no', 'title', 'requester'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        cancelled: 'default',
        converted: 'primary',
      },
      labelMap: {
        draft: i18n.t('scm.purchase_requisition.k26'),
        pending: i18n.t('scm.purchase_requisition.k27'),
        approved: i18n.t('scm.purchase_requisition.k28'),
        rejected: i18n.t('scm.purchase_requisition.k29'),
        cancelled: i18n.t('scm.purchase_requisition.k30'),
        converted: i18n.t('scm.purchase_requisition.k31'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.purchase_requisition.k32'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_requisition.k33'), value: 'all' },
          { label: i18n.t('scm.purchase_requisition.k34'), value: 'draft' },
          { label: i18n.t('scm.purchase_requisition.k35'), value: 'pending' },
          { label: i18n.t('scm.purchase_requisition.k36'), value: 'approved' },
          { label: i18n.t('scm.purchase_requisition.k37'), value: 'rejected' },
          { label: i18n.t('scm.purchase_requisition.k38'), value: 'cancelled' },
          { label: i18n.t('scm.purchase_requisition.k39'), value: 'converted' },
        ],
      },
      {
        id: 'priority',
        label: i18n.t('scm.purchase_requisition.k40'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_requisition.k41'), value: 'all' },
          { label: i18n.t('scm.purchase_requisition.k42'), value: 'low' },
          { label: i18n.t('scm.purchase_requisition.k43'), value: 'medium' },
          { label: i18n.t('scm.purchase_requisition.k44'), value: 'high' },
          { label: i18n.t('scm.purchase_requisition.k45'), value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.purchase_requisition.k46'),
      fields: ['req_no', 'title', 'requester', 'department', 'priority', 'status'],
    },
    {
      title: i18n.t('scm.purchase_requisition.k47'),
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_requisition.k48'),
  editTitle: i18n.t('scm.purchase_requisition.k49'),
  detailTitle: i18n.t('scm.purchase_requisition.k50'),

  nestedTables: [
    {
      field: 'items',
      title: i18n.t('scm.purchase_requisition.k51'),
      columns: columnsFromFields(itemFields),
      fields: itemFields,
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowDuplicate: true,
      addButtonText: i18n.t('scm.purchase_requisition.k52'),
      rowKeyField: 'line_no',
      minRows: 1,
      formColCount: 2,
    },
  ],
};
