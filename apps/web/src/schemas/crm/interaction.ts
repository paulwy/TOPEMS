import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const interactionSchema: EntitySchema = {
  entity: 'interaction',
  title: i18n.t('shared.interaction.k0'),
  description: i18n.t('shared.interaction.k1'),

  api: {
    module: 'crm',
    resource: 'interactions',
  },

  fields: [
    {
      name: 'customer_id',
      label: i18n.t('shared.interaction.id_2'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_id',
      label: i18n.t('shared.interaction.id_3'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'type',
      label: i18n.t('shared.interaction.k4'),
      type: 'select',
      required: true,
      defaultValue: 'call',
      options: {
        type: 'static',
        options: [
          { value: 'call', label: i18n.t('shared.interaction.k5') },
          { value: 'email', label: i18n.t('shared.interaction.k6') },
          { value: 'meeting', label: i18n.t('shared.interaction.k7') },
          { value: 'visit', label: i18n.t('shared.interaction.k8') },
          { value: 'other', label: i18n.t('shared.interaction.k9') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'subject',
      label: i18n.t('shared.interaction.k10'),
      type: 'text',
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'content',
      label: i18n.t('shared.interaction.k11'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scheduled_at',
      label: i18n.t('shared.interaction.k12'),
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'completed_at',
      label: i18n.t('shared.interaction.k13'),
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('shared.interaction.k14'),
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: i18n.t('shared.interaction.k15') },
          { value: 'completed', label: i18n.t('shared.interaction.k16') },
          { value: 'cancelled', label: i18n.t('shared.interaction.k17') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: i18n.t('shared.interaction.k18'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['subject', 'type', 'scheduled_at', 'completed_at', 'status'],
    searchFields: ['subject', 'content'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        scheduled: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        scheduled: i18n.t('shared.interaction.k19'),
        completed: i18n.t('shared.interaction.k20'),
        cancelled: i18n.t('shared.interaction.k21'),
      },
    },
    filters: [
      {
        id: 'type',
        label: i18n.t('shared.interaction.k22'),
        type: 'select',
        options: [
          { label: i18n.t('shared.interaction.k23'), value: 'all' },
          { label: i18n.t('shared.interaction.k24'), value: 'call' },
          { label: i18n.t('shared.interaction.k25'), value: 'email' },
          { label: i18n.t('shared.interaction.k26'), value: 'meeting' },
          { label: i18n.t('shared.interaction.k27'), value: 'visit' },
          { label: i18n.t('shared.interaction.k28'), value: 'other' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('shared.interaction.k29'),
        type: 'select',
        options: [
          { label: i18n.t('shared.interaction.k30'), value: 'all' },
          { label: i18n.t('shared.interaction.k31'), value: 'scheduled' },
          { label: i18n.t('shared.interaction.k32'), value: 'completed' },
          { label: i18n.t('shared.interaction.k33'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('shared.interaction.k34'),
      fields: ['customer_id', 'contact_id', 'type'],
    },
    {
      title: i18n.t('shared.interaction.k35'),
      fields: ['subject', 'content', 'scheduled_at'],
    },
    {
      title: i18n.t('shared.interaction.k36'),
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.interaction.k37'),
  editTitle: i18n.t('shared.interaction.k38'),
  detailTitle: i18n.t('shared.interaction.k39'),
};
