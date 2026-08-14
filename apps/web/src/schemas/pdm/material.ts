import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const materialSchema: EntitySchema = {
  entity: 'pdm_material',
  title: i18n.t('pdm.material.k0'),
  description: i18n.t('pdm.material.k1'),

  api: {
    module: 'pdm',
    resource: 'materials',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('pdm.material.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('pdm.material.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('pdm.material.k4'),
      type: 'select',
      defaultValue: 'raw_material',
      options: {
        type: 'static',
        options: [
          { value: 'raw_material', label: i18n.t('pdm.material.k5') },
          { value: 'auxiliary', label: i18n.t('pdm.material.k6') },
          { value: 'packaging', label: i18n.t('pdm.material.k7') },
          { value: 'finished_goods', label: i18n.t('pdm.material.k8') },
          { value: 'semi_finished', label: i18n.t('pdm.material.k9') },
          { value: 'spare_parts', label: i18n.t('pdm.material.k10') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'specification',
      label: i18n.t('pdm.material.k11'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'unit',
      label: i18n.t('pdm.material.k12'),
      type: 'text',
      defaultValue: 'kg',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'unit_price',
      label: i18n.t('pdm.material.k13'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'supplier',
      label: i18n.t('pdm.material.k14'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'status',
      label: i18n.t('pdm.material.k15'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('pdm.material.k16') },
          { value: 'inactive', label: i18n.t('pdm.material.k17') },
          { value: 'low_stock', label: i18n.t('pdm.material.k18') },
          { value: 'out_of_stock', label: i18n.t('pdm.material.k19') },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'inventory_quantity',
      label: i18n.t('pdm.material.k20'),
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
      align: 'right',
    },
    {
      name: 'safety_stock',
      label: i18n.t('pdm.material.k21'),
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      align: 'right',
    },
    {
      name: 'created_at',
      label: i18n.t('pdm.material.k22'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 160,
      hideInForm: true,
    },
    {
      name: 'updated_at',
      label: i18n.t('pdm.material.k23'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: [
      'code',
      'name',
      'category',
      'specification',
      'unit',
      'unit_price',
      'inventory_quantity',
      'safety_stock',
      'status',
    ],
    searchFields: ['code', 'name', 'supplier'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        low_stock: 'warning',
        out_of_stock: 'error',
      },
      labelMap: {
        active: i18n.t('pdm.material.k24'),
        inactive: i18n.t('pdm.material.k25'),
        low_stock: i18n.t('pdm.material.k26'),
        out_of_stock: i18n.t('pdm.material.k27'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('pdm.material.k28'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.material.k29'), value: 'all' },
          { label: i18n.t('pdm.material.k30'), value: 'raw_material' },
          { label: i18n.t('pdm.material.k31'), value: 'auxiliary' },
          { label: i18n.t('pdm.material.k32'), value: 'packaging' },
          { label: i18n.t('pdm.material.k33'), value: 'finished_goods' },
          { label: i18n.t('pdm.material.k34'), value: 'semi_finished' },
          { label: i18n.t('pdm.material.k35'), value: 'spare_parts' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('pdm.material.k36'),
        type: 'select',
        options: [
          { label: i18n.t('pdm.material.k37'), value: 'all' },
          { label: i18n.t('pdm.material.k38'), value: 'active' },
          { label: i18n.t('pdm.material.k39'), value: 'inactive' },
          { label: i18n.t('pdm.material.k40'), value: 'low_stock' },
          { label: i18n.t('pdm.material.k41'), value: 'out_of_stock' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('pdm.material.k42'),
      fields: ['code', 'name', 'category', 'specification', 'unit', 'unit_price'],
    },
    {
      title: i18n.t('pdm.material.k43'),
      fields: ['inventory_quantity', 'safety_stock', 'supplier', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('pdm.material.k44'),
  editTitle: i18n.t('pdm.material.k45'),
  detailTitle: i18n.t('pdm.material.k46'),
};
