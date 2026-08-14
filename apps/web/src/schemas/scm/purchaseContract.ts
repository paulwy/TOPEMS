import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const purchaseContractSchema: EntitySchema = {
  entity: 'purchaseContract',
  title: i18n.t('scm.purchase_contract.k0'),
  description: i18n.t('scm.purchase_contract.k1'),

  api: {
    module: 'scm',
    resource: 'purchaseContracts',
  },

  fields: [
    {
      name: 'contractNo',
      label: i18n.t('scm.purchase_contract.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'supplier_id',
      label: i18n.t('scm.purchase_contract.k3'),
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'title',
      label: i18n.t('scm.purchase_contract.k4'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'amount',
      label: i18n.t('scm.purchase_contract.k5'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'sign_date',
      label: i18n.t('scm.purchase_contract.k6'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('scm.purchase_contract.k7'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: i18n.t('scm.purchase_contract.k8'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.purchase_contract.k9'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('scm.purchase_contract.k10') },
          { value: 'pending', label: i18n.t('scm.purchase_contract.k11') },
          { value: 'approved', label: i18n.t('scm.purchase_contract.k12') },
          { value: 'active', label: i18n.t('scm.purchase_contract.k13') },
          { value: 'expired', label: i18n.t('scm.purchase_contract.k14') },
          { value: 'terminated', label: i18n.t('scm.purchase_contract.k15') },
          { value: 'cancelled', label: i18n.t('scm.purchase_contract.k16') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'terms',
      label: i18n.t('scm.purchase_contract.k17'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contractNo',
      'supplier_id',
      'title',
      'amount',
      'sign_date',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contractNo', 'title', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        active: 'primary',
        expired: 'default',
        terminated: 'error',
        cancelled: 'error',
      },
      labelMap: {
        draft: i18n.t('scm.purchase_contract.k18'),
        pending: i18n.t('scm.purchase_contract.k19'),
        approved: i18n.t('scm.purchase_contract.k20'),
        active: i18n.t('scm.purchase_contract.k21'),
        expired: i18n.t('scm.purchase_contract.k22'),
        terminated: i18n.t('scm.purchase_contract.k23'),
        cancelled: i18n.t('scm.purchase_contract.k24'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.purchase_contract.k25'),
        type: 'select',
        options: [
          { label: i18n.t('scm.purchase_contract.k26'), value: 'all' },
          { label: i18n.t('scm.purchase_contract.k27'), value: 'draft' },
          { label: i18n.t('scm.purchase_contract.k28'), value: 'pending' },
          { label: i18n.t('scm.purchase_contract.k29'), value: 'approved' },
          { label: i18n.t('scm.purchase_contract.k30'), value: 'active' },
          { label: i18n.t('scm.purchase_contract.k31'), value: 'expired' },
          { label: i18n.t('scm.purchase_contract.k32'), value: 'terminated' },
          { label: i18n.t('scm.purchase_contract.k33'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.purchase_contract.k34'),
      fields: ['contractNo', 'supplier_id', 'title', 'status'],
    },
    {
      title: i18n.t('scm.purchase_contract.k35'),
      fields: ['amount', 'sign_date', 'start_date', 'end_date'],
    },
    {
      title: i18n.t('scm.purchase_contract.k36'),
      fields: ['terms'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.purchase_contract.k37'),
  editTitle: i18n.t('scm.purchase_contract.k38'),
  detailTitle: i18n.t('scm.purchase_contract.k39'),
};
