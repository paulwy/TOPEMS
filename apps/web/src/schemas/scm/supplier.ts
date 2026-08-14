import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const supplierSchema: EntitySchema = {
  entity: 'supplier',
  title: i18n.t('scm.supplier.k0'),
  description: i18n.t('scm.supplier.k1'),

  api: {
    module: 'scm',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('scm.supplier.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('scm.supplier.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('scm.supplier.k4'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: i18n.t('scm.supplier.k5') },
          { value: 'packaging', label: i18n.t('scm.supplier.k6') },
          { value: 'machinery', label: i18n.t('scm.supplier.k7') },
          { value: 'electronics', label: i18n.t('scm.supplier.k8') },
          { value: 'chemicals', label: i18n.t('scm.supplier.k9') },
          { value: 'services', label: i18n.t('scm.supplier.k10') },
          { value: 'other', label: i18n.t('scm.supplier.k11') },
        ],
      },
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'level',
      label: i18n.t('scm.supplier.k12'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'strategic', label: i18n.t('scm.supplier.k13') },
          { value: 'preferred', label: i18n.t('scm.supplier.k14') },
          { value: 'regular', label: i18n.t('scm.supplier.k15') },
          { value: 'qualified', label: i18n.t('scm.supplier.k16') },
          { value: 'new', label: i18n.t('scm.supplier.k17') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'status',
      label: i18n.t('scm.supplier.k18'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('scm.supplier.k19') },
          { value: 'inactive', label: i18n.t('scm.supplier.k20') },
          { value: 'pending', label: i18n.t('scm.supplier.k21') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'contact',
      label: i18n.t('scm.supplier.k22'),
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'phone',
      label: i18n.t('scm.supplier.k23'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'email',
      label: i18n.t('scm.supplier.k24'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'address',
      label: i18n.t('scm.supplier.k25'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'rating',
      label: i18n.t('scm.supplier.k26'),
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'create_date',
      label: i18n.t('scm.supplier.k27'),
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'level', 'status', 'contact', 'phone', 'rating'],
    searchFields: ['code', 'name', 'contact'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'error',
        pending: 'warning',
      },
      labelMap: {
        active: i18n.t('scm.supplier.k28'),
        inactive: i18n.t('scm.supplier.k29'),
        pending: i18n.t('scm.supplier.k30'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.supplier.k31'),
        type: 'select',
        options: [
          { label: i18n.t('scm.supplier.k32'), value: 'all' },
          { label: i18n.t('scm.supplier.k33'), value: 'active' },
          { label: i18n.t('scm.supplier.k34'), value: 'inactive' },
          { label: i18n.t('scm.supplier.k35'), value: 'pending' },
        ],
      },
      {
        id: 'category',
        label: i18n.t('scm.supplier.k36'),
        type: 'select',
        options: [
          { label: i18n.t('scm.supplier.k37'), value: 'all' },
          { label: i18n.t('scm.supplier.k38'), value: 'raw_material' },
          { label: i18n.t('scm.supplier.k39'), value: 'packaging' },
          { label: i18n.t('scm.supplier.k40'), value: 'machinery' },
          { label: i18n.t('scm.supplier.k41'), value: 'electronics' },
          { label: i18n.t('scm.supplier.k42'), value: 'chemicals' },
          { label: i18n.t('scm.supplier.k43'), value: 'services' },
          { label: i18n.t('scm.supplier.k44'), value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.supplier.k45'),
      fields: ['code', 'name', 'category', 'level', 'status'],
    },
    {
      title: i18n.t('scm.supplier.k46'),
      fields: ['contact', 'phone', 'email', 'address'],
    },
    {
      title: i18n.t('scm.supplier.k47'),
      fields: ['rating', 'create_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.supplier.k48'),
  editTitle: i18n.t('scm.supplier.k49'),
  detailTitle: i18n.t('scm.supplier.k50'),
};
