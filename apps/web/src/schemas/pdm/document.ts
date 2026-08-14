import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const documentSchema: EntitySchema = {
  entity: 'pdm_document',
  title: i18n.t('pdm.document.k0'),
  description: i18n.t('pdm.document.k1'),

  api: {
    module: 'pdm',
    resource: 'documents',
  },

  fields: [
    {
      name: 'document_no',
      label: i18n.t('pdm.document.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: i18n.t('pdm.document.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'type',
      label: i18n.t('pdm.document.k4'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'specification', label: i18n.t('pdm.document.k5') },
          { value: 'manual', label: i18n.t('pdm.document.k6') },
          { value: 'drawing', label: i18n.t('pdm.document.k7') },
          { value: 'report', label: i18n.t('pdm.document.k8') },
          { value: 'procedure', label: i18n.t('pdm.document.k9') },
          { value: 'other', label: i18n.t('pdm.document.k10') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'category',
      label: i18n.t('pdm.document.k11'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'current_version',
      label: i18n.t('pdm.document.k12'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'version_count',
      label: i18n.t('pdm.document.k13'),
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'status',
      label: i18n.t('pdm.document.k14'),
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: i18n.t('pdm.document.k15') },
          { value: 'review', label: i18n.t('pdm.document.k16') },
          { value: 'approved', label: i18n.t('pdm.document.k17') },
          { value: 'published', label: i18n.t('pdm.document.k18') },
          { value: 'archived', label: i18n.t('pdm.document.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'uploader_name',
      label: i18n.t('pdm.document.k20'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('pdm.document.k21'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'document_no',
      'name',
      'type',
      'category',
      'current_version',
      'uploader_name',
      'status',
    ],
    searchFields: ['document_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        review: 'warning',
        approved: 'info',
        published: 'success',
        archived: 'default',
      },
      labelMap: {
        draft: i18n.t('pdm.document.k22'),
        review: i18n.t('pdm.document.k23'),
        approved: i18n.t('pdm.document.k24'),
        published: i18n.t('pdm.document.k25'),
        archived: i18n.t('pdm.document.k26'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('pdm.document.k27'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.document.k28'), value: 'all' },
          { label: i18n.t('pdm.document.k29'), value: 'draft' },
          { label: i18n.t('pdm.document.k30'), value: 'review' },
          { label: i18n.t('pdm.document.k31'), value: 'approved' },
          { label: i18n.t('pdm.document.k32'), value: 'published' },
          { label: i18n.t('pdm.document.k33'), value: 'archived' },
        ],
      },
      {
        id: 'type',
        label: i18n.t('pdm.document.k34'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.document.k35'), value: 'all' },
          { label: i18n.t('pdm.document.k36'), value: 'specification' },
          { label: i18n.t('pdm.document.k37'), value: 'manual' },
          { label: i18n.t('pdm.document.k38'), value: 'drawing' },
          { label: i18n.t('pdm.document.k39'), value: 'report' },
          { label: i18n.t('pdm.document.k40'), value: 'procedure' },
          { label: i18n.t('pdm.document.k41'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.document.k42'),
      fields: ['document_no', 'name', 'type', 'category'],
    },
    {
      title: i18n.t('pdm.document.k43'),
      fields: ['current_version', 'version_count'],
    },
    {
      title: i18n.t('pdm.document.k44'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.document.k45'),
  editTitle: i18n.t('pdm.document.k46'),
  detailTitle: i18n.t('pdm.document.k47'),
};
