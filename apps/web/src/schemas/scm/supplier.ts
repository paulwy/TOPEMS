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
      // 后端真键为 supplier_no（GET /api/scm/suppliers 返回），创建兼容 alias code
      name: 'supplier_no',
      label: i18n.t('scm.supplier.k2'),
      type: 'text',
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
      // 后端真键 contact_name
      name: 'contact_name',
      label: i18n.t('scm.supplier.k22'),
      type: 'text',
      listWidth: 100,
    },
    {
      // 后端真键 contact_phone
      name: 'contact_phone',
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
  ],

  list: {
    columns: ['supplier_no', 'name', 'status', 'contact_name', 'contact_phone'],
    searchFields: ['supplier_no', 'name', 'contact_name'],
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
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.supplier.k45'),
      fields: ['supplier_no', 'name', 'status'],
    },
    {
      title: i18n.t('scm.supplier.k46'),
      fields: ['contact_name', 'contact_phone', 'email', 'address'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.supplier.k48'),
  editTitle: i18n.t('scm.supplier.k49'),
  detailTitle: i18n.t('scm.supplier.k50'),
};
