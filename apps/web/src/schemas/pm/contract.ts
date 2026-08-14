import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  pending: 'warning',
  approved: 'primary',
  active: 'success',
  completed: 'primary',
  cancelled: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  draft: i18n.t('shared.contract.k0'),
  pending: i18n.t('shared.contract.k1'),
  approved: i18n.t('shared.contract.k2'),
  active: i18n.t('shared.contract.k3'),
  completed: i18n.t('shared.contract.k4'),
  cancelled: i18n.t('shared.contract.k5'),
};

const CONTRACT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'construction', label: i18n.t('shared.contract.k6') },
  { value: 'service', label: i18n.t('shared.contract.k7') },
  { value: 'purchase', label: i18n.t('shared.contract.k8') },
  { value: 'sales', label: i18n.t('shared.contract.k9') },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: i18n.t('shared.contract.k10') },
  { value: 'pending', label: i18n.t('shared.contract.k11') },
  { value: 'approved', label: i18n.t('shared.contract.k12') },
  { value: 'active', label: i18n.t('shared.contract.k13') },
  { value: 'completed', label: i18n.t('shared.contract.k14') },
  { value: 'cancelled', label: i18n.t('shared.contract.k15') },
];

const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
});

export const contractSchema: EntitySchema = {
  entity: 'pm_contract',
  title: i18n.t('shared.contract.k16'),
  description: i18n.t('shared.contract.k17'),

  api: {
    module: 'pm',
    resource: 'contracts',
  },

  fields: [
    {
      name: 'contract_name',
      label: i18n.t('shared.contract.k18'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'contractNo',
      label: i18n.t('shared.contract.k19'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'contract_type',
      label: i18n.t('shared.contract.k20'),
      type: 'select',
      required: true,
      options: { type: 'static', options: CONTRACT_TYPE_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'party_a',
      label: i18n.t('shared.contract.k21'),
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'party_b',
      label: i18n.t('shared.contract.k22'),
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'amount',
      label: i18n.t('shared.contract.k23'),
      type: 'number',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const amount = row.amount as number | undefined;
        if (!amount) return '-';
        return CURRENCY_FORMATTER.format(amount);
      },
    },
    {
      name: 'currency',
      label: i18n.t('shared.contract.k24'),
      type: 'text',
      defaultValue: 'CNY',
      listWidth: 80,
      showInList: false,
      validation: [{ type: 'maxLength', value: 10 }],
    },
    {
      name: 'sign_date',
      label: i18n.t('shared.contract.k25'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: i18n.t('shared.contract.k26'),
      type: 'date',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'end_date',
      label: i18n.t('shared.contract.k27'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('shared.contract.k28'),
      type: 'select',
      defaultValue: 'draft',
      options: { type: 'static', options: STATUS_OPTIONS },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: i18n.t('shared.contract.k29'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 150,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('shared.contract.k30'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contract_name',
      'contractNo',
      'contract_type',
      'party_b',
      'amount',
      'status',
      'sign_date',
      'end_date',
    ],
    searchFields: ['contract_name', 'contractNo'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'contract_type',
        label: i18n.t('shared.contract.k31'),
        type: 'select',
        options: [{ label: i18n.t('shared.contract.k32'), value: 'all' }, ...CONTRACT_TYPE_OPTIONS],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('shared.contract.k33'),
        type: 'select',
        options: [{ label: i18n.t('shared.contract.k34'), value: 'all' }, ...STATUS_OPTIONS],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('shared.contract.k35'),
      fields: ['contract_name', 'contractNo', 'contract_type', 'status'],
    },
    {
      title: i18n.t('shared.contract.k36'),
      fields: ['party_a', 'party_b'],
    },
    {
      title: i18n.t('shared.contract.k37'),
      fields: ['amount', 'currency', 'sign_date', 'start_date', 'end_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.contract.k38'),
  editTitle: i18n.t('shared.contract.k39'),
  detailTitle: i18n.t('shared.contract.k40'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
