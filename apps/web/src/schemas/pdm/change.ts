import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const changeSchema: EntitySchema = {
  entity: 'pdm_change',
  title: i18n.t('pdm.change.k0'),
  description: i18n.t('pdm.change.k1'),

  api: {
    module: 'pdm',
    resource: 'changeOrders',
  },

  fields: [
    {
      name: 'change_no',
      label: i18n.t('pdm.change.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: i18n.t('pdm.change.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'type',
      label: i18n.t('pdm.change.k4'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'design', label: i18n.t('pdm.change.k5') },
          { value: 'process', label: i18n.t('pdm.change.k6') },
          { value: 'material', label: i18n.t('pdm.change.k7') },
          { value: 'equipment', label: i18n.t('pdm.change.k8') },
          { value: 'other', label: i18n.t('pdm.change.k9') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'priority',
      label: i18n.t('pdm.change.k10'),
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: i18n.t('pdm.change.k11') },
          { value: 'normal', label: i18n.t('pdm.change.k12') },
          { value: 'high', label: i18n.t('pdm.change.k13') },
          { value: 'urgent', label: i18n.t('pdm.change.k14') },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'applicant_name',
      label: i18n.t('pdm.change.k15'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'apply_date',
      label: i18n.t('pdm.change.k16'),
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'approved_by',
      label: i18n.t('pdm.change.k17'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'approved_date',
      label: i18n.t('pdm.change.k18'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('pdm.change.k19'),
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('pdm.change.k20') },
          { value: 'reviewing', label: i18n.t('pdm.change.k21') },
          { value: 'approved', label: i18n.t('pdm.change.k22') },
          { value: 'rejected', label: i18n.t('pdm.change.k23') },
          { value: 'implemented', label: i18n.t('pdm.change.k24') },
          { value: 'closed', label: i18n.t('pdm.change.k25') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'reason',
      label: i18n.t('pdm.change.k26'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'description',
      label: i18n.t('pdm.change.k27'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'impact_analysis',
      label: i18n.t('pdm.change.k28'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: i18n.t('pdm.change.k29'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['change_no', 'title', 'type', 'priority', 'applicant_name', 'apply_date', 'status'],
    searchFields: ['change_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        reviewing: 'info',
        approved: 'success',
        rejected: 'error',
        implemented: 'success',
        closed: 'default',
      },
      labelMap: {
        pending: i18n.t('pdm.change.k30'),
        reviewing: i18n.t('pdm.change.k31'),
        approved: i18n.t('pdm.change.k32'),
        rejected: i18n.t('pdm.change.k33'),
        implemented: i18n.t('pdm.change.k34'),
        closed: i18n.t('pdm.change.k35'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.change.k36'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.change.k37'), value: 'all' },
          { label: i18n.t('pdm.change.k38'), value: 'pending' },
          { label: i18n.t('pdm.change.k39'), value: 'reviewing' },
          { label: i18n.t('pdm.change.k40'), value: 'approved' },
          { label: i18n.t('pdm.change.k41'), value: 'rejected' },
          { label: i18n.t('pdm.change.k42'), value: 'implemented' },
          { label: i18n.t('pdm.change.k43'), value: 'closed' },
        ],
      },
      {
        id: 'type',
        label: i18n.t('pdm.change.k44'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.change.k45'), value: 'all' },
          { label: i18n.t('pdm.change.k46'), value: 'design' },
          { label: i18n.t('pdm.change.k47'), value: 'process' },
          { label: i18n.t('pdm.change.k48'), value: 'material' },
          { label: i18n.t('pdm.change.k49'), value: 'equipment' },
          { label: i18n.t('pdm.change.k50'), value: 'other' },
        ],
      },
      {
        id: 'priority',
        label: i18n.t('pdm.change.k51'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.change.k52'), value: 'all' },
          { label: i18n.t('pdm.change.k53'), value: 'low' },
          { label: i18n.t('pdm.change.k54'), value: 'normal' },
          { label: i18n.t('pdm.change.k55'), value: 'high' },
          { label: i18n.t('pdm.change.k56'), value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.change.k57'),
      fields: ['change_no', 'title', 'type', 'priority'],
    },
    {
      title: i18n.t('pdm.change.k58'),
      fields: ['applicant_name', 'apply_date', 'approved_by', 'approved_date'],
    },
    {
      title: i18n.t('pdm.change.k59'),
      fields: ['reason', 'description', 'impact_analysis'],
    },
    {
      title: i18n.t('pdm.change.k60'),
      fields: ['status', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.change.k61'),
  editTitle: i18n.t('pdm.change.k62'),
  detailTitle: i18n.t('pdm.change.k63'),
};
