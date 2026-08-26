import type { EntitySchema } from '@/schema';
import type { SubscriptionFrequency } from '@/api/report';
import i18n from '@/i18n';

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'daily', label: i18n.t('shared.subscription.k0') },
  { value: 'weekly', label: i18n.t('shared.subscription.k1') },
  { value: 'monthly', label: i18n.t('shared.subscription.k2') },
  { value: 'quarterly', label: i18n.t('shared.subscription.k3') },
];

const getFrequencyLabel = (frequency: SubscriptionFrequency) => {
  return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency;
};

export const subscriptionSchema: EntitySchema = {
  entity: 'report_subscription',
  title: i18n.t('shared.subscription.k4'),
  description: i18n.t('shared.subscription.k5'),

  api: {
    module: 'report',
    resource: 'subscriptions',
  },

  fields: [
    {
      name: 'template_name',
      label: i18n.t('shared.subscription.k6'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'template_id',
      label: i18n.t('shared.subscription.id_7'),
      type: 'text',
      required: true,
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'user_id',
      label: i18n.t('shared.subscription.id_8'),
      type: 'text',
      required: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'email',
      label: i18n.t('shared.subscription.k9'),
      type: 'text',
      listWidth: 200,
    },
    {
      name: 'frequency',
      label: i18n.t('shared.subscription.k10'),
      type: 'select',
      required: true,
      defaultValue: 'weekly',
      options: {
        type: 'static',
        options: FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        getFrequencyLabel(row.frequency as SubscriptionFrequency),
    },
    {
      name: 'enabled',
      label: i18n.t('shared.subscription.k11'),
      type: 'switch',
      defaultValue: true,
      listWidth: 120,
    },
    {
      name: 'created_at',
      label: i18n.t('shared.subscription.k12'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      renderCell: (row: Record<string, unknown>) =>
        row.created_at ? new Date(row.created_at as string).toLocaleString('zh-CN') : '-',
    },
  ],

  list: {
    columns: ['template_name', 'user_id', 'email', 'frequency', 'enabled', 'created_at'],
    searchFields: ['template_name', 'template_id', 'email', 'user_id'],
    pageSize: 10,
    statusBadge: {
      field: 'enabled',
      colorMap: {
        true: 'success',
        false: 'default',
      },
      labelMap: {
        true: i18n.t('shared.subscription.k13'),
        false: i18n.t('shared.subscription.k14'),
      },
    },
    filters: [
      {
        id: 'frequency',
        label: i18n.t('shared.subscription.k15'),
        type: 'select',
        options: [
          { label: i18n.t('shared.subscription.k16'), value: 'all' },
          ...FREQUENCY_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.subscription.k17'),
        type: 'select',
        options: [
          { label: i18n.t('shared.subscription.k18'), value: 'all' },
          { label: i18n.t('shared.subscription.k19'), value: 'enabled' },
          { label: i18n.t('shared.subscription.k20'), value: 'disabled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.subscription.k21'),
      fields: ['template_id', 'template_name', 'user_id', 'email'],
    },
    {
      title: i18n.t('shared.subscription.k22'),
      fields: ['frequency', 'enabled'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.subscription.k23'),
  editTitle: i18n.t('shared.subscription.k24'),
  detailTitle: i18n.t('shared.subscription.k25'),
};
