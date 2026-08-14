import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const recruitmentSchema: EntitySchema = {
  entity: 'hrm_recruitment',
  title: i18n.t('hrm.recruitment.k0'),
  description: i18n.t('hrm.recruitment.k1'),

  api: {
    module: 'hrm',
    resource: 'jobOpenings',
  },

  fields: [
    {
      name: 'title',
      label: i18n.t('hrm.recruitment.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'code',
      label: i18n.t('hrm.recruitment.k3'),
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'department_id',
      label: i18n.t('hrm.recruitment.k4'),
      type: 'select',
      listWidth: 140,
    },
    {
      name: 'employment_type',
      label: i18n.t('hrm.recruitment.k5'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'full_time', label: i18n.t('hrm.recruitment.k6') },
          { value: 'part_time', label: i18n.t('hrm.recruitment.k7') },
          { value: 'contract', label: i18n.t('hrm.recruitment.k8') },
          { value: 'intern', label: i18n.t('hrm.recruitment.k9') },
          { value: 'temporary', label: i18n.t('hrm.recruitment.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'location',
      label: i18n.t('hrm.recruitment.k11'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'salary_min',
      label: i18n.t('hrm.recruitment.k12'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'salary_max',
      label: i18n.t('hrm.recruitment.k13'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: i18n.t('hrm.recruitment.k14'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('hrm.recruitment.k15') },
          { value: 'published', label: i18n.t('hrm.recruitment.k16') },
          { value: 'in_progress', label: i18n.t('hrm.recruitment.k17') },
          { value: 'closed', label: i18n.t('hrm.recruitment.k18') },
          { value: 'filled', label: i18n.t('hrm.recruitment.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'publish_date',
      label: i18n.t('hrm.recruitment.k20'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'close_date',
      label: i18n.t('hrm.recruitment.k21'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'description',
      label: i18n.t('hrm.recruitment.k22'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'requirements',
      label: i18n.t('hrm.recruitment.k23'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'title',
      'code',
      'department_id',
      'employment_type',
      'location',
      'salary_min',
      'salary_max',
      'status',
    ],
    searchFields: ['title', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        published: 'info',
        in_progress: 'success',
        closed: 'default',
        filled: 'success',
      },
      labelMap: {
        draft: i18n.t('hrm.recruitment.k24'),
        published: i18n.t('hrm.recruitment.k25'),
        in_progress: i18n.t('hrm.recruitment.k26'),
        closed: i18n.t('hrm.recruitment.k27'),
        filled: i18n.t('hrm.recruitment.k28'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.recruitment.k29'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.recruitment.k30'), value: 'all' },
          { label: i18n.t('hrm.recruitment.k31'), value: 'draft' },
          { label: i18n.t('hrm.recruitment.k32'), value: 'published' },
          { label: i18n.t('hrm.recruitment.k33'), value: 'in_progress' },
          { label: i18n.t('hrm.recruitment.k34'), value: 'closed' },
          { label: i18n.t('hrm.recruitment.k35'), value: 'filled' },
        ],
      },
      {
        id: 'employment_type',
        label: i18n.t('hrm.recruitment.k36'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.recruitment.k37'), value: 'all' },
          { label: i18n.t('hrm.recruitment.k38'), value: 'full_time' },
          { label: i18n.t('hrm.recruitment.k39'), value: 'part_time' },
          { label: i18n.t('hrm.recruitment.k40'), value: 'contract' },
          { label: i18n.t('hrm.recruitment.k41'), value: 'intern' },
          { label: i18n.t('hrm.recruitment.k42'), value: 'temporary' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('hrm.recruitment.k43'),
      fields: ['title', 'code', 'department_id', 'employment_type', 'location'],
    },
    {
      title: i18n.t('hrm.recruitment.k44'),
      fields: ['salary_min', 'salary_max'],
    },
    {
      title: i18n.t('hrm.recruitment.k45'),
      fields: ['publish_date', 'close_date', 'status'],
    },
    {
      title: i18n.t('hrm.recruitment.k46'),
      fields: ['description', 'requirements'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.recruitment.k47'),
  editTitle: i18n.t('hrm.recruitment.k48'),
  detailTitle: i18n.t('hrm.recruitment.k49'),
};
