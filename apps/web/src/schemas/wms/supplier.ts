import type { EntitySchema } from '@/schema-dsl';
import i18n from '@/i18n';

export const supplierSchema: EntitySchema = {
  entity: 'wms_supplier',
  title: i18n.t('wms.supplier.k0'),
  description: i18n.t('wms.supplier.k1'),

  api: {
    // 供应主数据实际挂在 /api/master-data/suppliers（不是 /api/mdm，后者 404）
    module: 'master-data',
    resource: 'suppliers',
  },

  // 批 23：写权限资源前缀（DB 实查 create/update/delete 三码齐全）
  permissionResource: 'scm:supplier',

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
      name: 'contact_person',
      label: i18n.t('wms.supplier.k4'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'phone',
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
      name: 'tax_id',
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
    columns: ['name', 'contact_person', 'phone', 'email', 'status'],
    searchFields: ['name', 'contact_person'],
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
      fields: ['name', 'status'],
    },
    {
      title: i18n.t('wms.supplier.k25'),
      fields: ['contact_person', 'phone', 'email', 'address'],
    },
    {
      title: i18n.t('wms.supplier.k26'),
      fields: ['bank_account', 'tax_id'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('wms.supplier.k27'),
  editTitle: i18n.t('wms.supplier.k28'),
  detailTitle: i18n.t('wms.supplier.k29'),
};
