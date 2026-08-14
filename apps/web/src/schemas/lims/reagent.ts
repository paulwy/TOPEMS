import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const reagentSchema: EntitySchema = {
  entity: 'reagent',
  title: i18n.t('lims.reagent.k0'),
  description: i18n.t('lims.reagent.k1'),

  api: {
    module: 'lims',
    resource: 'reagents',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('lims.reagent.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: i18n.t('lims.reagent.k3'),
      type: 'text',
      required: true,
      listWidth: 140,
    },
    {
      name: 'category',
      label: i18n.t('lims.reagent.k4'),
      type: 'select',
      defaultValue: '',
      options: {
        type: 'static',
        options: [
          { value: '', label: i18n.t('lims.reagent.k5') },
          { value: i18n.t('lims.reagent.k6'), label: i18n.t('lims.reagent.k7') },
          { value: i18n.t('lims.reagent.k8'), label: i18n.t('lims.reagent.k9') },
          { value: i18n.t('lims.reagent.k10'), label: i18n.t('lims.reagent.k11') },
          { value: i18n.t('lims.reagent.k12'), label: i18n.t('lims.reagent.k13') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'supplier',
      label: i18n.t('lims.reagent.k14'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'specification',
      label: i18n.t('lims.reagent.k15'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'unit',
      label: i18n.t('lims.reagent.k16'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'quantity',
      label: i18n.t('lims.reagent.k17'),
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'min_stock',
      label: i18n.t('lims.reagent.k18'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'batch_no',
      label: i18n.t('lims.reagent.k19'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'received_date',
      label: i18n.t('lims.reagent.k20'),
      type: 'date',
      showInList: false,
    },
    {
      name: 'expiry_date',
      label: i18n.t('lims.reagent.k21'),
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'storage_condition',
      label: i18n.t('lims.reagent.k22'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'location',
      label: i18n.t('lims.reagent.k23'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'status',
      label: i18n.t('lims.reagent.k24'),
      type: 'select',
      defaultValue: i18n.t('lims.reagent.k25'),
      options: {
        type: 'static',
        options: [
          { value: i18n.t('lims.reagent.k26'), label: i18n.t('lims.reagent.k27') },
          { value: i18n.t('lims.reagent.k28'), label: i18n.t('lims.reagent.k29') },
          { value: i18n.t('lims.reagent.k30'), label: i18n.t('lims.reagent.k31') },
          { value: i18n.t('lims.reagent.k32'), label: i18n.t('lims.reagent.k33') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'description',
      label: i18n.t('lims.reagent.k34'),
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('lims.reagent.k35'),
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'category',
      'supplier',
      'quantity',
      'expiry_date',
      'status',
      'location',
    ],
    searchFields: ['code', 'name', 'supplier'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        [i18n.t('schemas.reagent.k0')]: 'success',
        [i18n.t('schemas.reagent.k1')]: 'warning',
        [i18n.t('schemas.reagent.k2')]: 'error',
        [i18n.t('schemas.reagent.k3')]: 'default',
      },
      labelMap: {
        [i18n.t('schemas.reagent.k4')]: i18n.t('lims.reagent.k36'),
        [i18n.t('schemas.reagent.k5')]: i18n.t('lims.reagent.k37'),
        [i18n.t('schemas.reagent.k6')]: i18n.t('lims.reagent.k38'),
        [i18n.t('schemas.reagent.k7')]: i18n.t('lims.reagent.k39'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('lims.reagent.k40'),
        type: 'select',
        options: [
          { label: i18n.t('lims.reagent.k41'), value: 'all' },
          { label: i18n.t('lims.reagent.k42'), value: i18n.t('lims.reagent.k43') },
          { label: i18n.t('lims.reagent.k44'), value: i18n.t('lims.reagent.k45') },
          { label: i18n.t('lims.reagent.k46'), value: i18n.t('lims.reagent.k47') },
          { label: i18n.t('lims.reagent.k48'), value: i18n.t('lims.reagent.k49') },
        ],
      },
      {
        id: 'category',
        label: i18n.t('lims.reagent.k50'),
        type: 'select',
        options: [
          { label: i18n.t('lims.reagent.k51'), value: 'all' },
          { label: i18n.t('lims.reagent.k52'), value: i18n.t('lims.reagent.k53') },
          { label: i18n.t('lims.reagent.k54'), value: i18n.t('lims.reagent.k55') },
          { label: i18n.t('lims.reagent.k56'), value: i18n.t('lims.reagent.k57') },
          { label: i18n.t('lims.reagent.k58'), value: i18n.t('lims.reagent.k59') },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('lims.reagent.k60'),
      fields: ['code', 'name', 'category', 'supplier'],
    },
    {
      title: i18n.t('lims.reagent.k61'),
      fields: ['specification', 'unit', 'quantity', 'min_stock'],
    },
    {
      title: i18n.t('lims.reagent.k62'),
      fields: ['batch_no', 'received_date', 'expiry_date', 'storage_condition', 'location'],
    },
    {
      title: i18n.t('lims.reagent.k63'),
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('lims.reagent.k64'),
  editTitle: i18n.t('lims.reagent.k65'),
  detailTitle: i18n.t('lims.reagent.k66'),
};
