import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const companySchema: EntitySchema = {
  entity: 'hrm_company',
  title: i18n.t('hrm.company.k0'),
  description: i18n.t('hrm.company.k1'),

  api: {
    module: 'hrm',
    resource: 'companies',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('hrm.company.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'short_name',
      label: i18n.t('hrm.company.k3'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'registration_number',
      label: i18n.t('hrm.company.k4'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'tax_number',
      label: i18n.t('hrm.company.k5'),
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'address',
      label: i18n.t('hrm.company.k6'),
      type: 'text',
      listWidth: 200,
    },
    {
      name: 'contact_phone',
      label: i18n.t('hrm.company.k7'),
      type: 'text',
      listWidth: 130,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'email',
      label: i18n.t('hrm.company.k8'),
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'website',
      label: i18n.t('hrm.company.k9'),
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'status',
      label: i18n.t('hrm.company.k10'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('hrm.company.k11') },
          { value: 'inactive', label: i18n.t('hrm.company.k12') },
          { value: 'archived', label: i18n.t('hrm.company.k13') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: i18n.t('hrm.company.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('hrm.company.k15'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'short_name',
      'registration_number',
      'tax_number',
      'contact_phone',
      'email',
      'status',
    ],
    searchFields: ['name', 'short_name', 'registration_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        archived: 'warning',
      },
      labelMap: {
        active: i18n.t('hrm.company.k16'),
        inactive: i18n.t('hrm.company.k17'),
        archived: i18n.t('hrm.company.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('hrm.company.k19'),
        type: 'select',
        options: [
          { label: i18n.t('hrm.company.k20'), value: 'all' },
          { label: i18n.t('hrm.company.k21'), value: 'active' },
          { label: i18n.t('hrm.company.k22'), value: 'inactive' },
          { label: i18n.t('hrm.company.k23'), value: 'archived' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('hrm.company.k24'),
      fields: ['name', 'short_name', 'status'],
    },
    {
      title: i18n.t('hrm.company.k25'),
      fields: ['registration_number', 'tax_number'],
    },
    {
      title: i18n.t('hrm.company.k26'),
      fields: ['address', 'contact_phone', 'email', 'website'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('hrm.company.k27'),
  editTitle: i18n.t('hrm.company.k28'),
  detailTitle: i18n.t('hrm.company.k29'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
