import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const supplierSchema: EntitySchema = {
  entity: 'wms_supplier',
  title: i18n.t('wms.supplier.k0'),
  description: i18n.t('wms.supplier.k1'),

  api: {
    module: 'scm',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('wms.supplier.k2'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'short_name',
      label: i18n.t('wms.supplier.k3'),
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'contact_name',
      label: i18n.t('wms.supplier.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_phone',
      label: i18n.t('wms.supplier.k5'),
      type: 'text',
      listWidth: 130,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'email',
      label: i18n.t('wms.supplier.k6'),
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'status',
      label: i18n.t('wms.supplier.k7'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('wms.supplier.k8') },
          { value: 'inactive', label: i18n.t('wms.supplier.k9') },
          { value: 'blocked', label: i18n.t('wms.supplier.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'address',
      label: i18n.t('wms.supplier.k11'),
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'bank_account',
      label: i18n.t('wms.supplier.k12'),
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'tax_number',
      label: i18n.t('wms.supplier.k13'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('wms.supplier.k14'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: i18n.t('wms.supplier.k15'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['name', 'short_name', 'contact_name', 'contact_phone', 'email', 'status'],
    searchFields: ['name', 'contact_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        blocked: 'error',
      },
      labelMap: {
        active: i18n.t('wms.supplier.k16'),
        inactive: i18n.t('wms.supplier.k17'),
        blocked: i18n.t('wms.supplier.k18'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('wms.supplier.k19'),
        type: 'select',
        options: [
          { label: i18n.t('wms.supplier.k20'), value: 'all' },
          { label: i18n.t('wms.supplier.k21'), value: 'active' },
          { label: i18n.t('wms.supplier.k22'), value: 'inactive' },
          { label: i18n.t('wms.supplier.k23'), value: 'blocked' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('wms.supplier.k24'),
      fields: ['name', 'short_name', 'status'],
    },
    {
      title: i18n.t('wms.supplier.k25'),
      fields: ['contact_name', 'contact_phone', 'email', 'address'],
    },
    {
      title: i18n.t('wms.supplier.k26'),
      fields: ['bank_account', 'tax_number'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.supplier.k27'),
  editTitle: i18n.t('wms.supplier.k28'),
  detailTitle: i18n.t('wms.supplier.k29'),
};
