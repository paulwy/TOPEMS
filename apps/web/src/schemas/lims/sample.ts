/**
 * 样品管理 Schema — 驱动 SampleReceivePage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const sampleSchema: EntitySchema = {
  entity: 'limsSample',
  title: i18n.t('lims.sample.k0'),
  description: i18n.t('lims.sample.k1'),

  api: {
    module: 'lims',
    resource: 'samples',
  },

  fields: [
    {
      name: 'sample_no',
      label: i18n.t('lims.sample.k2'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => String(row.sample_no || row.id || '-'),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('lims.sample.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'description',
      label: i18n.t('lims.sample.k4'),
      type: 'textarea',
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) => String(row.description || '-'),
    },
    {
      name: 'status',
      label: i18n.t('lims.sample.k5'),
      type: 'select',
      defaultValue: i18n.t('lims.sample.k6'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.sample.k7'), label: i18n.t('lims.sample.k8') },
          { value: i18n.t('lims.sample.k9'), label: i18n.t('lims.sample.k10') },
          { value: i18n.t('lims.sample.k11'), label: i18n.t('lims.sample.k12') },
          { value: i18n.t('lims.sample.k13'), label: i18n.t('lims.sample.k14') },
          { value: i18n.t('lims.sample.k15'), label: i18n.t('lims.sample.k16') },
          { value: i18n.t('lims.sample.k17'), label: i18n.t('lims.sample.k18') },
          { value: i18n.t('lims.sample.k19'), label: i18n.t('lims.sample.k20') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'received_date',
      label: i18n.t('lims.sample.k21'),
      type: 'date',
      listWidth: 130,
    },
    {
      name: 'sample_type',
      label: i18n.t('lims.sample.k22'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'source',
      label: i18n.t('lims.sample.k23'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'quantity',
      label: i18n.t('lims.sample.k24'),
      type: 'number',
      listWidth: 80,
    },
    {
      name: 'unit',
      label: i18n.t('lims.sample.k25'),
      type: 'text',
      listWidth: 70,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'location',
      label: i18n.t('lims.sample.k26'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'responsible_person',
      label: i18n.t('lims.sample.k27'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'storage_condition',
      label: i18n.t('lims.sample.k28'),
      type: 'text',
      showInList: false,
    },
  ],

  list: {
    columns: ['sample_no', 'name', 'description', 'status', 'received_date', 'location'],
    searchFields: ['sample_no', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.sample.k0')]: 'default',
        [i18n.t('schemas.sample.k1')]: 'warning',
        [i18n.t('schemas.sample.k2')]: 'primary',
        [i18n.t('schemas.sample.k3')]: 'info',
        [i18n.t('schemas.sample.k4')]: 'success',
        [i18n.t('schemas.sample.k5')]: 'info',
        [i18n.t('schemas.sample.k6')]: 'success',
      },
      labelMap: {
        [i18n.t('schemas.sample.k7')]: i18n.t('lims.sample.k29'),
        [i18n.t('schemas.sample.k8')]: i18n.t('lims.sample.k30'),
        [i18n.t('schemas.sample.k9')]: i18n.t('lims.sample.k31'),
        [i18n.t('schemas.sample.k10')]: i18n.t('lims.sample.k32'),
        [i18n.t('schemas.sample.k11')]: i18n.t('lims.sample.k33'),
        [i18n.t('schemas.sample.k12')]: i18n.t('lims.sample.k34'),
        [i18n.t('schemas.sample.k13')]: i18n.t('lims.sample.k35'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.sample.k36'),
        type: 'select',
        options: [
          { label: i18n.t('lims.sample.k37'), value: 'all' },
          { label: i18n.t('lims.sample.k38'), value: i18n.t('lims.sample.k39') },
          { label: i18n.t('lims.sample.k40'), value: i18n.t('lims.sample.k41') },
          { label: i18n.t('lims.sample.k42'), value: i18n.t('lims.sample.k43') },
          { label: i18n.t('lims.sample.k44'), value: i18n.t('lims.sample.k45') },
          { label: i18n.t('lims.sample.k46'), value: i18n.t('lims.sample.k47') },
          { label: i18n.t('lims.sample.k48'), value: i18n.t('lims.sample.k49') },
          { label: i18n.t('lims.sample.k50'), value: i18n.t('lims.sample.k51') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.sample.k52'),
      fields: ['name', 'description', 'sample_type', 'source'],
    },
    {
      title: i18n.t('lims.sample.k53'),
      fields: ['status', 'received_date'],
    },
    {
      title: i18n.t('lims.sample.k54'),
      fields: ['quantity', 'unit', 'storage_condition', 'location', 'responsible_person'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.sample.k55'),
  editTitle: i18n.t('lims.sample.k56'),
  detailTitle: i18n.t('lims.sample.k57'),
};
